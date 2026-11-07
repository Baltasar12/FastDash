import "./server-only";
import type { DataError } from "@/types/f1-provider";
import { ProviderFailure, invalid } from "./validation";

export interface TransportOptions {
  readonly fetch: typeof fetch;
  readonly now: () => number;
  readonly sleep: (milliseconds: number) => Promise<void>;
  readonly random: () => number;
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

interface Budget {
  requests: number[];
  cooldownUntil: number;
  queue: Promise<void>;
  pending: number;
}
const budgets = new WeakMap<typeof fetch, Budget>();
const HOUR = 3_600_000;

function failure(
  code: DataError["code"],
  retryable: boolean,
  retryAt?: number,
): ProviderFailure {
  const messages: Record<DataError["code"], string> = {
    "invalid-request": "The F1 data request is invalid.",
    network: "Jolpica could not be reached.",
    timeout: "The Jolpica request timed out.",
    "rate-limited": "Jolpica requests are temporarily rate limited.",
    "invalid-response": "Jolpica returned an invalid response.",
    "temporarily-unavailable": "Jolpica is temporarily unavailable.",
    cancelled: "The Jolpica request was cancelled.",
  };
  return new ProviderFailure({
    code,
    message: messages[code],
    retryable,
    ...(retryAt === undefined
      ? {}
      : { retryAt: new Date(retryAt).toISOString() }),
  });
}

function retryAfter(value: string | null, now: number): number {
  if (value !== null) {
    if (/^\d+$/.test(value)) {
      const seconds = Number(value);
      if (Number.isSafeInteger(seconds))
        return now + Math.min(Math.max(seconds, 1), 86400) * 1000;
    }
    if (
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(
        value,
      )
    ) {
      const at = Date.parse(value);
      if (Number.isFinite(at) && at > now) return Math.min(at, now + 86400_000);
    }
  }
  return now + 60_000;
}

/** Resource cleanup must never replace a classified operational failure. */
async function cancelBestEffort(
  resource: { cancel(): Promise<unknown> } | null | undefined,
): Promise<void> {
  try {
    await resource?.cancel();
  } catch {
    // An already errored/cancelled upstream stream can reject cancellation.
  }
}

async function readJson(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  if (
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
    await cancelBestEffort(response.body);
    invalid();
  }
  const maxBytes = 2 * 1024 * 1024;
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > maxBytes
  ) {
    await cancelBestEffort(response.body);
    invalid();
  }
  if (!response.body) invalid();
  const reader = response.body.getReader();
  const cancel = () => {
    void cancelBestEffort(reader);
  };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await cancelBestEffort(reader);
        invalid();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error) {
    await cancelBestEffort(reader);
    if (error instanceof ProviderFailure) throw error;
    invalid();
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

export function createTransport(
  options: TransportOptions,
): (path: string, offset: number, limit: number) => Promise<unknown> {
  const existing = budgets.get(options.fetch);
  const budget: Budget = existing ?? {
    requests: [],
    cooldownUntil: 0,
    queue: Promise.resolve(),
    pending: 0,
  };
  budgets.set(options.fetch, budget);

  async function attempt(url: string): Promise<unknown> {
    const at = options.now();
    budget.requests = budget.requests.filter((stamp) => stamp > at - HOUR);
    if (budget.cooldownUntil > at)
      throw failure("rate-limited", true, budget.cooldownUntil);
    const first = budget.requests[0];
    if (budget.requests.length >= 500 && first !== undefined)
      throw failure("rate-limited", true, first + HOUR);
    const recent = budget.requests.filter((stamp) => stamp > at - 1000);
    if (recent.length >= 4 && recent[0] !== undefined)
      await options.sleep(Math.max(1, recent[0] + 1000 - at));
    budget.requests.push(options.now());
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        abort.abort();
        reject(failure("timeout", true));
      }, options.timeoutMs);
    });
    try {
      return await Promise.race([
        (async () => {
          let response: Response;
          try {
            response = await options.fetch(url, {
              method: "GET",
              headers: {
                Accept: "application/json",
                "User-Agent": "SECTOR/0.1.0 (independent F1 analytics)",
              },
              cache: "no-store",
              redirect: "error",
              signal: abort.signal,
            });
          } catch {
            throw failure(abort.signal.aborted ? "timeout" : "network", true);
          }
          if (response.status === 429) {
            budget.cooldownUntil = Math.max(
              budget.cooldownUntil,
              retryAfter(response.headers.get("retry-after"), options.now()),
            );
            await cancelBestEffort(response.body);
            throw failure("rate-limited", true, budget.cooldownUntil);
          }
          if (!response.ok) {
            await cancelBestEffort(response.body);
            throw failure(
              response.status >= 500
                ? "temporarily-unavailable"
                : "invalid-response",
              response.status >= 500,
            );
          }
          return readJson(response, abort.signal);
        })(),
        timeout,
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  return async (path, offset, limit) => {
    if (budget.pending >= 64) throw failure("temporarily-unavailable", true);
    budget.pending++;
    const url = `https://api.jolpi.ca/ergast/f1/${path}/?limit=${limit}&offset=${offset}`;
    try {
      for (let retry = 0; ; retry++) {
        const previous = budget.queue;
        let release: () => void = () => {};
        budget.queue = new Promise<void>((resolve) => {
          release = resolve;
        });
        try {
          await previous;
          return await attempt(url);
        } catch (error) {
          if (!(error instanceof ProviderFailure)) throw error;
          if (
            !error.detail.retryable ||
            error.detail.code === "rate-limited" ||
            retry >= options.maxRetries
          )
            throw error;
        } finally {
          release();
        }
        const jitter = Math.max(0, Math.min(1, options.random()));
        await options.sleep(250 * 2 ** retry + Math.floor(jitter * 100));
      }
    } finally {
      budget.pending--;
    }
  };
}

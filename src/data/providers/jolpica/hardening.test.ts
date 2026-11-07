import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataResult } from "@/types/f1-provider";
import { createJolpicaProvider } from "./index";
import { createTransport } from "./transport";
import { calendarPage, race, seasonsPage } from "./fixtures/wire";

vi.mock("./server-only", () => ({}));

const NOW = Date.parse("2026-11-07T12:00:00.000Z");
const HOUR = 3_600_000;

function success<T>(result: DataResult<T>) {
  expect(result.status).toBe("success");
  if (result.status !== "success") throw new Error("Expected success");
  return result;
}

function failed<T>(result: DataResult<T>) {
  expect(result.status).toBe("error");
  if (result.status !== "error") throw new Error("Expected operational error");
  return result;
}

function harness(
  reply: (url: URL, init?: RequestInit) => unknown | Promise<unknown>,
  options: Parameters<typeof createJolpicaProvider>[0] = {},
) {
  let current = NOW;
  const callsAt: number[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    callsAt.push(current);
    const value = await reply(new URL(String(input)), init);
    return value instanceof Response ? value : Response.json(value);
  });
  const sleep = vi.fn(async (ms: number) => {
    current += ms;
  });
  const dependencies = {
    fetch: fetchMock,
    now: () => current,
    sleep,
    random: () => 0,
    maxRetries: 0,
    ...options,
  };
  return {
    provider: createJolpicaProvider(dependencies),
    anotherProvider: () => createJolpicaProvider(dependencies),
    fetchMock,
    sleep,
    callsAt,
    advance: (ms: number) => {
      current += ms;
    },
    advanceTo: (instant: string | undefined) => {
      if (instant === undefined) throw new Error("Expected retry guidance");
      current = Date.parse(instant);
    },
    now: () => current,
  };
}

afterEach(() => vi.useRealTimers());

describe("historical cache reuse without a finality claim", () => {
  it("projects an event from a fresh historical calendar without renewing its expiry", async () => {
    const { provider, fetchMock, advance } = harness(() => calendarPage());
    const calendar = success(
      await provider.getSeasonCalendar({ season: 2024 }),
    );
    advance(HOUR - 1);
    const event = success(
      await provider.getEventDetails({ season: 2024, round: 1 }),
    );
    expect(event.data).toEqual(calendar.data[0]);
    expect(event.metadata).toMatchObject({
      retrievedAt: calendar.metadata.retrievedAt,
      expiresAt: calendar.metadata.expiresAt,
      freshness: "fresh",
      cache: "hit",
      finality: "unknown",
      source: calendar.metadata.source,
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.data)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    advance(1);
    const refreshed = success(
      await provider.getEventDetails({ season: 2024, round: 1 }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshed.metadata.retrievedAt).not.toBe(
      calendar.metadata.retrievedAt,
    );
  });

  it("shares a concurrent calendar request with event-details readers", async () => {
    let finish: ((value: unknown) => void) | undefined;
    const { provider, fetchMock } = harness(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const calendar = provider.getSeasonCalendar({ season: 2024 });
    const event = provider.getEventDetails({ season: 2024, round: 1 });
    await vi.waitFor(() => expect(finish).toBeDefined());
    if (!finish) throw new Error("Expected pending calendar request");
    finish(calendarPage());
    const [calendarResult, eventResult] = await Promise.all([calendar, event]);
    expect(success(eventResult).metadata.retrievedAt).toBe(
      success(calendarResult).metadata.retrievedAt,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not infer a missing event solely from a cached calendar", async () => {
    const { provider, fetchMock } = harness((url) =>
      calendarPage([
        { ...race, round: url.pathname.includes("/2/races/") ? "2" : "1" },
      ]),
    );
    success(await provider.getSeasonCalendar({ season: 2024 }));
    expect(
      success(await provider.getEventDetails({ season: 2024, round: 2 })).data
        .round,
    ).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retains frequently read historical entries when the bounded cache evicts cold entries", async () => {
    const { provider, fetchMock } = harness((url) => {
      const round = /\/2024\/(\d+)\/races\//.exec(url.pathname)?.[1];
      if (round === undefined) throw new Error("Expected event request");
      return calendarPage([{ ...race, round }]);
    });
    const hot = success(
      await provider.getEventDetails({ season: 2024, round: 1 }),
    );
    for (let round = 2; round <= 129; round++) {
      success(await provider.getEventDetails({ season: 2024, round }));
      const reused = success(
        await provider.getEventDetails({ season: 2024, round: 1 }),
      );
      expect(reused.metadata.expiresAt).toBe(hot.metadata.expiresAt);
      expect(reused.metadata.retrievedAt).toBe(hot.metadata.retrievedAt);
    }
    expect(fetchMock).toHaveBeenCalledTimes(129);
    success(await provider.getEventDetails({ season: 2024, round: 2 }));
    expect(fetchMock).toHaveBeenCalledTimes(130);
  });
});

describe("bounded retry and operational failure suppression", () => {
  it("prevents queued distinct requests from each starting a retry sequence during an outage", async () => {
    const test = harness(() => new Response("SECRET", { status: 503 }), {
      maxRetries: 2,
    });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        test.provider.getEventDetails({ season: 2024, round: index + 1 }),
      ),
    );
    for (const result of results)
      expect(failed(result).error.code).toBe("temporarily-unavailable");
    expect(test.fetchMock).toHaveBeenCalledTimes(3);
    expect(test.sleep.mock.calls.map(([ms]) => ms)).toEqual([250, 500]);
    expect(JSON.stringify(results)).not.toContain("SECRET");
  });
  it("retries with exponential delays and lets concurrent and later callers share the exhausted failure", async () => {
    const { provider, fetchMock, sleep } = harness(
      () => {
        throw new Error("SECRET upstream outage");
      },
      { maxRetries: 2 },
    );
    const first = provider.getSupportedSeasons();
    const duplicate = provider.getSupportedSeasons();
    const [firstResult, duplicateResult] = await Promise.all([
      first,
      duplicate,
    ]);
    const originalFailure = failed(firstResult);
    expect(originalFailure.error.code).toBe("network");
    expect(failed(duplicateResult).error.code).toBe("network");
    const later = failed(await provider.getSupportedSeasons());
    expect(later.metadata.attemptedAt).toBe(
      originalFailure.metadata.attemptedAt,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([250, 500]);
    expect(JSON.stringify(later)).not.toContain("SECRET");
  });

  it("opens a shared process circuit with increasing cooldown after exhausted probes", async () => {
    let recover = false;
    const test = harness(() => {
      if (!recover) throw new Error("outage");
      return seasonsPage();
    });
    const first = failed(await test.provider.getSupportedSeasons());
    expect(Date.parse(first.error.retryAt ?? "") - test.now()).toBe(5_000);
    const other = test.anotherProvider();
    expect(failed(await other.getSupportedSeasons()).error.code).toBe(
      "network",
    );
    expect(test.fetchMock).toHaveBeenCalledTimes(1);
    test.advanceTo(first.error.retryAt);
    const second = failed(await test.provider.getSupportedSeasons());
    expect(Date.parse(second.error.retryAt ?? "") - test.now()).toBe(10_000);
    expect(test.fetchMock).toHaveBeenCalledTimes(2);
    let previous = second;
    for (const delay of [20_000, 40_000, 60_000, 60_000]) {
      test.advanceTo(previous.error.retryAt);
      previous = failed(await test.provider.getSupportedSeasons());
      expect(Date.parse(previous.error.retryAt ?? "") - test.now()).toBe(delay);
    }
    recover = true;
    test.advanceTo(previous.error.retryAt);
    success(await test.provider.getSupportedSeasons());
    expect(test.fetchMock).toHaveBeenCalledTimes(7);
    recover = false;
    const reset = failed(
      await test.provider.getSeasonCalendar({ season: 2024 }),
    );
    expect(Date.parse(reset.error.retryAt ?? "") - test.now()).toBe(5_000);
  });

  it("rechecks the original stale ceiling even during the short failure cooldown", async () => {
    let outage = false;
    const test = harness(() => {
      if (outage) throw new Error("offline");
      return seasonsPage();
    });
    const original = success(await test.provider.getSupportedSeasons());
    outage = true;
    test.advance(8 * 24 * HOUR - 1);
    const stale = success(await test.provider.getSupportedSeasons());
    expect(stale.metadata).toMatchObject({
      freshness: "stale",
      retrievedAt: original.metadata.retrievedAt,
      expiresAt: original.metadata.expiresAt,
      revalidationError: { code: "network" },
    });
    test.advance(1);
    expect(failed(await test.provider.getSupportedSeasons()).error.code).toBe(
      "network",
    );
    expect(test.fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never serves a cached empty response as stale success after upstream failure", async () => {
    let outage = false;
    const test = harness(() => {
      if (outage) throw new Error("offline");
      return seasonsPage([]);
    });
    expect((await test.provider.getSupportedSeasons()).status).toBe("empty");
    outage = true;
    test.advance(30_000);
    expect(failed(await test.provider.getSupportedSeasons()).error.code).toBe(
      "network",
    );
  });

  it("aborts a stalled response body and bounds retries without converting timeout into invalid-response", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const test = harness(
      (_url, init) => {
        if (init?.signal) signals.push(init.signal);
        return new Response(new ReadableStream<Uint8Array>(), {
          headers: { "Content-Type": "application/json" },
        });
      },
      { timeoutMs: 10, maxRetries: 2 },
    );
    const pending = test.provider.getSupportedSeasons();
    await vi.advanceTimersByTimeAsync(100);
    expect(failed(await pending).error.code).toBe("timeout");
    expect(test.fetchMock).toHaveBeenCalledTimes(3);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(test.sleep.mock.calls.map(([ms]) => ms)).toEqual([250, 500]);
  });
});

describe("provider cooldown and quota degradation", () => {
  it("rechecks the burst window after a sleep resolves earlier than requested", async () => {
    let current = NOW;
    let firstSleep = true;
    const callsAt: number[] = [];
    const fetchMock = vi.fn<typeof fetch>(async () => {
      callsAt.push(current);
      return Response.json(seasonsPage());
    });
    const sleep = vi.fn(async (ms: number) => {
      current += firstSleep ? 500 : ms;
      firstSleep = false;
    });
    const request = createTransport({
      fetch: fetchMock,
      now: () => current,
      sleep,
      random: () => 0,
      timeoutMs: 100,
      maxRetries: 0,
    });
    for (let index = 0; index < 5; index++) await request("seasons", 0, 100);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1_000, 500]);
    expect(callsAt).toEqual([NOW, NOW, NOW, NOW, NOW + 1_000]);
  });
  it.each(["172800", "Mon, 09 Nov 2026 12:00:00 GMT"])(
    "honors Retry-After longer than one day (%s) without an early retry",
    async (retryAfter) => {
      const test = harness(
        () =>
          new Response("", {
            status: 429,
            headers: { "Retry-After": retryAfter },
          }),
        { maxRetries: 2 },
      );
      const first = failed(await test.provider.getSupportedSeasons());
      expect(first.error).toMatchObject({
        code: "rate-limited",
        retryAt: "2026-11-09T12:00:00.000Z",
      });
      test.advance(24 * HOUR + 1);
      expect(
        failed(await test.anotherProvider().getSupportedSeasons()).error.code,
      ).toBe("rate-limited");
      expect(test.fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("honors a 503 Retry-After across operations, then permits a probe exactly at expiry", async () => {
    let recover = false;
    const test = harness(
      () =>
        recover
          ? seasonsPage()
          : new Response("SECRET", {
              status: 503,
              headers: { "Retry-After": "60" },
            }),
      { maxRetries: 2 },
    );
    const first = failed(await test.provider.getSupportedSeasons());
    expect(first.error).toMatchObject({
      code: "temporarily-unavailable",
      retryAt: "2026-11-07T12:01:00.000Z",
    });
    expect(
      failed(await test.provider.getSeasonCalendar({ season: 2024 })).error
        .code,
    ).toBe("temporarily-unavailable");
    expect(test.fetchMock).toHaveBeenCalledTimes(1);
    expect(test.sleep).not.toHaveBeenCalled();
    recover = true;
    test.advance(60_000);
    success(await test.provider.getSupportedSeasons());
    expect(test.fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves eligible stale data at quota exhaustion and allows a request when the rolling hour releases a slot", async () => {
    const test = harness((url) => {
      if (url.pathname.includes("seasons")) return seasonsPage();
      const round = /\/2024\/(\d+)\/races\//.exec(url.pathname)?.[1];
      if (round === undefined) throw new Error("Expected event request");
      return calendarPage([{ ...race, round }]);
    });
    const original = success(await test.provider.getSupportedSeasons());
    test.advance(24 * HOUR);
    const independentCache = test.anotherProvider();
    const firstBudgetRequest = test.now();
    for (let round = 1; round <= 500; round++)
      success(await independentCache.getEventDetails({ season: 2024, round }));
    const stale = success(await test.provider.getSupportedSeasons());
    expect(stale.metadata).toMatchObject({
      freshness: "stale",
      expiresAt: original.metadata.expiresAt,
      revalidationError: { code: "rate-limited" },
    });
    const blocked = failed(
      await independentCache.getEventDetails({ season: 2024, round: 501 }),
    );
    expect(blocked.error).toMatchObject({
      code: "rate-limited",
      retryAt: new Date(firstBudgetRequest + HOUR).toISOString(),
    });
    expect(test.fetchMock).toHaveBeenCalledTimes(501);
    test.advanceTo(blocked.error.retryAt);
    success(
      await independentCache.getEventDetails({ season: 2024, round: 501 }),
    );
    expect(test.fetchMock).toHaveBeenCalledTimes(502);
    for (let index = 4; index < test.callsAt.length; index++) {
      const current = test.callsAt[index];
      const previous = test.callsAt[index - 4];
      if (current === undefined || previous === undefined)
        throw new Error("Expected recorded request times");
      expect(current - previous).toBeGreaterThanOrEqual(1_000);
    }
  });
});

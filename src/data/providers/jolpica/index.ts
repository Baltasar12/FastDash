import "./server-only";
import type {
  ConstructorStanding,
  DriverStanding,
  GrandPrix,
  QualifyingResult,
  RaceResult,
  Season,
} from "@/types/f1";
import type {
  DataResult,
  EventRequest,
  F1DataProvider,
  ResponseMetadata,
  SeasonRequest,
} from "@/types/f1-provider";
import * as normalize from "./normalize";
import { createTransport } from "./transport";
import {
  array,
  freeze,
  integer,
  invalid,
  object,
  ProviderFailure,
  year,
} from "./validation";

export interface JolpicaProviderOptions {
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly random?: () => number;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly pageSize?: number;
  readonly maxPages?: number;
}

export const JOLPICA_SOURCE = freeze({
  id: "jolpica",
  name: "Jolpica-F1",
  kind: "external" as const,
  reference: "https://github.com/jolpica/jolpica-f1",
  attribution: [
    "Data: Jolpica-F1 (https://jolpi.ca/).",
    "CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "SECTOR normalizes Jolpica-F1 data; independent of Formula 1, the FIA and teams.",
  ],
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
type Outcome<T> =
  | { status: "success"; data: T }
  | { status: "empty"; reason: "no-entries" }
  | {
      status: "unavailable";
      reason:
        | "unknown-season"
        | "unknown-event"
        | "not-published"
        | "not-covered"
        | "cancelled";
    };

function option(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new RangeError("Invalid Jolpica provider configuration.");
  return value;
}

function resultIdentity(row: RaceResult | QualifyingResult): string {
  return JSON.stringify([
    row.driver.driver.id,
    row.constructor.status === "available"
      ? row.constructor.value.id
      : row.constructor.status,
    row.driver.racingNumber,
  ]);
}

function validRequest(
  request: unknown,
  event: boolean,
): request is SeasonRequest & Partial<EventRequest> {
  if (typeof request !== "object" || request === null || Array.isArray(request))
    return false;
  const row = object(request);
  if (
    Object.keys(row).some(
      (key) => key !== "season" && (!event || key !== "round"),
    )
  )
    return false;
  return (
    typeof row.season === "number" &&
    Number.isSafeInteger(row.season) &&
    row.season >= 1950 &&
    row.season <= 9999 &&
    (!event ||
      (typeof row.round === "number" &&
        Number.isSafeInteger(row.round) &&
        row.round >= 1))
  );
}

function availabilityEvidence<T>(result: DataResult<T>) {
  if (result.status === "error") throw new ProviderFailure(result.error);
  if (result.metadata.freshness === "stale") {
    throw new ProviderFailure(
      result.metadata.revalidationError ?? {
        code: "temporarily-unavailable",
        message: "Jolpica availability could not be verified with fresh data.",
        retryable: true,
      },
    );
  }
  return result;
}

/** Call at a server query boundary. Reuse the singleton for process-local caching. */
export function createJolpicaProvider(
  options: JolpicaProviderOptions = {},
): F1DataProvider {
  const now = options.now ?? Date.now;
  const pageSize = option(options.pageSize, 100, 1, 100);
  const maxPages = option(options.maxPages, 100, 1, 100);
  const requestJson = createTransport({
    fetch: options.fetch ?? globalThis.fetch,
    now,
    sleep:
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    random: options.random ?? Math.random,
    timeoutMs: option(options.timeoutMs, 8000, 1, 30000),
    maxRetries: option(options.maxRetries, 2, 0, 2),
  });
  // Bound retained normalized data across all seven independently typed caches.
  const retained = new Map<string, { bytes: number; evict: () => void }>();
  let retainedBytes = 0;

  function forget(key: string) {
    const entry = retained.get(key);
    if (entry) {
      retainedBytes -= entry.bytes;
      entry.evict();
      retained.delete(key);
    }
  }

  function failure<T>(error: ProviderFailure): DataResult<T> {
    return freeze({
      status: "error",
      error: error.detail,
      metadata: {
        source: JOLPICA_SOURCE,
        attemptedAt: new Date(now()).toISOString(),
      },
    });
  }

  function metadata(ttl: number): ResponseMetadata & { expiresAt: string } {
    const at = now();
    return {
      source: JOLPICA_SOURCE,
      retrievedAt: new Date(at).toISOString(),
      expiresAt: new Date(at + ttl).toISOString(),
      freshness: "fresh",
      cache: "miss",
      finality: "unknown",
      completeness: "complete",
    };
  }

  function cached<T, Q extends SeasonRequest | EventRequest | undefined>(
    operation: string,
    ttl: number,
    staleCeiling: number,
    loader: (query: Q) => Promise<Outcome<T>>,
  ) {
    const cache = new Map<
      string,
      { result: Exclude<DataResult<T>, { status: "error" }>; expires: number }
    >();
    const inflight = new Map<string, Promise<DataResult<T>>>();
    return async (query: Q): Promise<DataResult<T>> => {
      const requiresEvent =
        operation === "event-details" ||
        operation === "results" ||
        operation === "qualifying";
      if (
        operation !== "supported-seasons" &&
        !validRequest(query, requiresEvent)
      )
        return failure(
          new ProviderFailure({
            code: "invalid-request",
            message:
              "Use a valid integer season and round without additional selectors.",
            retryable: false,
          }),
        );
      if (query !== undefined) {
        // Explicitly capture required primitives, including valid inherited or
        // nonenumerable fields, before deriving either the key or async query.
        query = Object.assign(
          {},
          query,
          { season: query.season },
          requiresEvent && "round" in query ? { round: query.round } : {},
        );
      }
      const fields =
        query === undefined
          ? ""
          : Object.entries(query)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(
                ([key, value]) => `${key}=${encodeURIComponent(String(value))}`,
              )
              .join("&");
      const key = `sector:f1:v1:jolpica:${operation}:${fields}`;
      const previous = cache.get(key);
      if (previous && previous.expires > now())
        return freeze({
          ...previous.result,
          metadata: { ...previous.result.metadata, cache: "hit" },
        });
      const pending = inflight.get(key);
      if (pending) return pending;
      if (inflight.size >= 64)
        return failure(
          new ProviderFailure({
            code: "temporarily-unavailable",
            message: "The Jolpica request queue is full. Try again shortly.",
            retryable: true,
          }),
        );
      const work = (async (): Promise<DataResult<T>> => {
        try {
          const outcome = await loader(query);
          const effectiveTtl = outcome.status === "success" ? ttl : 30_000;
          const result = freeze({
            ...outcome,
            metadata: {
              ...metadata(effectiveTtl),
              ...(outcome.status === "success" || outcome.status === "empty"
                ? {}
                : { completeness: "unknown" as const }),
            },
          });
          forget(key);
          const bytes = JSON.stringify(result).length * 2;
          if (bytes <= 2 * 1024 * 1024) {
            while (
              retained.size >= 128 ||
              retainedBytes + bytes > 8 * 1024 * 1024
            ) {
              const oldest = retained.keys().next().value;
              if (oldest === undefined) break;
              forget(oldest);
            }
            cache.set(key, {
              result,
              expires: Date.parse(result.metadata.expiresAt),
            });
            retained.set(key, {
              bytes,
              evict: () => {
                cache.delete(key);
              },
            });
            retainedBytes += bytes;
          }
          return result;
        } catch (error) {
          if (!(error instanceof ProviderFailure)) throw error;
          if (
            previous?.result.status === "success" &&
            now() < previous.expires + staleCeiling
          ) {
            return freeze({
              ...previous.result,
              metadata: {
                ...previous.result.metadata,
                cache: "hit",
                freshness: "stale",
                revalidationError: error.detail,
              },
            });
          }
          return failure(error);
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, work);
      return work;
    };
  }

  async function collect<T>(
    path: string,
    extract: (root: Record<string, unknown>) => T[],
  ): Promise<T[]> {
    const rows: T[] = [];
    const seen = new Set<string>();
    let total: number | undefined;
    let offset = 0;
    let normalizedCharacters = 0;
    for (let page = 0; page < maxPages; page++) {
      const root = object(
        object(await requestJson(path, offset, pageSize)).MRData,
      );
      if (root.series !== "f1" || integer(root.offset) !== offset) invalid();
      const limit = integer(root.limit, 1);
      const reportedTotal = integer(root.total);
      if (
        limit > 100 ||
        limit > pageSize ||
        (total !== undefined && total !== reportedTotal)
      )
        invalid();
      total = reportedTotal;
      if (total > pageSize * maxPages) invalid();
      const batch = extract(root);
      if (
        batch.length > limit ||
        offset + batch.length > total ||
        (batch.length === 0 && offset < total)
      )
        invalid();
      for (const item of batch) {
        const fingerprint = JSON.stringify(item);
        normalizedCharacters += fingerprint.length;
        if (normalizedCharacters > 1024 * 1024) invalid();
        if (seen.has(fingerprint)) invalid();
        seen.add(fingerprint);
        rows.push(item);
      }
      offset += batch.length;
      if (offset === total) return rows;
    }
    invalid();
  }

  const getSupportedSeasons = cached<readonly Season[], undefined>(
    "supported-seasons",
    24 * HOUR,
    7 * 24 * HOUR,
    async () => {
      const rows = await collect("seasons", (root) =>
        array(object(root.SeasonTable).Seasons).map(normalize.season),
      );
      if (new Set(rows.map((item) => item.year)).size !== rows.length)
        invalid();
      return rows.length
        ? { status: "success", data: rows }
        : { status: "empty", reason: "no-entries" };
    },
  );

  async function absentSeason(season: number): Promise<Outcome<never>> {
    const supported = availabilityEvidence(
      await getSupportedSeasons(undefined),
    );
    if (
      supported.status === "success" &&
      supported.data.some((item) => item.year === season)
    )
      return { status: "unavailable", reason: "not-published" };
    if (supported.status === "unavailable") return supported;
    return { status: "unavailable", reason: "unknown-season" };
  }

  const getSeasonCalendar = cached<readonly GrandPrix[], SeasonRequest>(
    "season-calendar",
    HOUR,
    24 * HOUR,
    async (query) => {
      const rows = await collect(`${query.season}/races`, (root) => {
        const table = object(root.RaceTable);
        if (table.season !== undefined && year(table.season) !== query.season)
          invalid();
        return array(table.Races).map((row) =>
          normalize.event(row, query.season),
        );
      });
      if (new Set(rows.map((item) => item.id)).size !== rows.length) invalid();
      return rows.length
        ? { status: "success", data: rows }
        : absentSeason(query.season);
    },
  );

  const getEventDetails = cached<GrandPrix, EventRequest>(
    "event-details",
    HOUR,
    24 * HOUR,
    async (query) => {
      const rows = await collect(
        `${query.season}/${query.round}/races`,
        (root) => {
          const table = object(root.RaceTable);
          if (table.season !== undefined && year(table.season) !== query.season)
            invalid();
          if (
            table.round !== undefined &&
            integer(table.round, 1) !== query.round
          )
            invalid();
          return array(table.Races).map((row) =>
            normalize.event(row, query.season, query.round),
          );
        },
      );
      if (rows.length > 1) invalid();
      const found = rows[0];
      if (found) return { status: "success", data: found };
      const calendar = availabilityEvidence(
        await getSeasonCalendar({ season: query.season }),
      );
      if (calendar.status === "unavailable") return calendar;
      // Inconsistent presence on the season endpoint is not evidence of nonexistence.
      if (
        calendar.status === "success" &&
        calendar.data.some((item) => item.round === query.round)
      )
        invalid();
      return { status: "unavailable", reason: "unknown-event" };
    },
  );

  function standings<T>(
    operation: string,
    listKey: string,
    normalizeRow: (value: unknown, season: number, round: unknown) => T,
    identity: (row: T) => string,
  ) {
    return cached<readonly T[], SeasonRequest>(
      operation,
      5 * MINUTE,
      HOUR,
      async (query) => {
        let asOf: string | undefined;
        const rows = await collect(`${query.season}/${operation}`, (root) => {
          const table = object(root.StandingsTable);
          if (table.season !== undefined && year(table.season) !== query.season)
            invalid();
          const lists = array(table.StandingsLists);
          if (lists.length > 1) invalid();
          return lists.flatMap((value) => {
            const list = object(value);
            if (year(list.season) !== query.season) invalid();
            const round = list.round ?? table.round;
            if (round !== undefined) integer(round);
            const currentAsOf = JSON.stringify(round);
            if (asOf !== undefined && asOf !== currentAsOf) invalid();
            asOf = currentAsOf;
            return array(list[listKey]).map((row) =>
              normalizeRow(row, query.season, round),
            );
          });
        });
        if (new Set(rows.map(identity)).size !== rows.length) invalid();
        if (rows.length) return { status: "success", data: rows };
        return absentSeason(query.season);
      },
    );
  }

  const getDriverStandings = standings<DriverStanding>(
    "driverstandings",
    "DriverStandings",
    normalize.driverStanding,
    (row) => row.driver.driver.id,
  );
  const getConstructorStandings = standings<ConstructorStanding>(
    "constructorstandings",
    "ConstructorStandings",
    normalize.constructorStanding,
    (row) => row.constructor.id,
  );

  function results<T>(
    operation: string,
    listKey: string,
    normalizeRow: (value: unknown, season: number, round: number) => T,
    identity: (row: T) => string,
  ) {
    return cached<readonly T[], EventRequest>(
      operation,
      5 * MINUTE,
      HOUR,
      async (query) => {
        let eventFingerprint: string | undefined;
        const rows = await collect(
          `${query.season}/${query.round}/${operation}`,
          (root) => {
            const table = object(root.RaceTable);
            if (
              table.season !== undefined &&
              year(table.season) !== query.season
            )
              invalid();
            if (
              table.round !== undefined &&
              integer(table.round, 1) !== query.round
            )
              invalid();
            const races = array(table.Races);
            if (races.length > 1) invalid();
            return races.flatMap((value) => {
              const race = object(value);
              const fingerprint = JSON.stringify(
                normalize.event(race, query.season, query.round),
              );
              if (
                eventFingerprint !== undefined &&
                fingerprint !== eventFingerprint
              )
                invalid();
              eventFingerprint = fingerprint;
              return array(race[listKey]).map((row) =>
                normalizeRow(row, query.season, query.round),
              );
            });
          },
        );
        if (new Set(rows.map(identity)).size !== rows.length) invalid();
        if (rows.length) return { status: "success", data: rows };
        const event = availabilityEvidence(await getEventDetails(query));
        if (event.status === "unavailable") return event;
        return { status: "unavailable", reason: "not-published" };
      },
    );
  }

  const getRaceResults = results<RaceResult>(
    "results",
    "Results",
    normalize.raceResult,
    resultIdentity,
  );
  const getQualifyingResults = results<QualifyingResult>(
    "qualifying",
    "QualifyingResults",
    normalize.qualifyingResult,
    resultIdentity,
  );

  return Object.freeze({
    getSupportedSeasons: () => getSupportedSeasons(undefined),
    getSeasonCalendar,
    getDriverStandings,
    getConstructorStandings,
    getEventDetails,
    getRaceResults,
    getQualifyingResults,
  });
}

export const jolpicaProvider = createJolpicaProvider();

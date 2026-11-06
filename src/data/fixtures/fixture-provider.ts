/** Opt-in test/preview provider. No network, clock, cache service or fallback. */
import type {
  ConstructorStanding,
  DriverStanding,
  GrandPrix,
  QualifyingResult,
  RaceResult,
} from "@/types/f1";
import { createEventId, createSessionId } from "@/types/f1-identifiers";
import type {
  DataError,
  DataResult,
  EventRequest,
  F1DataProvider,
  ResponseMetadata,
  SeasonRequest,
} from "@/types/f1-provider";
import {
  available,
  FIXTURE_SEASON,
  sampleConstructorStandings,
  sampleDriverStandings,
  sampleIncompleteEvent,
  sampleQualifyingResults,
  sampleRaceResults,
  sampleRegularEvent,
  sampleSeason,
  sampleSprintEvent,
} from "./f1";
import { sampleErrors, sampleMetadata, sampleSource } from "./results";

export interface FixtureProviderOptions {
  readonly scenario?:
    | "success"
    | "empty"
    | "not-published"
    | "not-covered"
    | "cancelled"
    | "partial"
    | "stale"
    | "missing-qualifying"
    | "error";
  /** Used only for scenario:error; defaults to network. */
  readonly errorCode?: DataError["code"];
}

/** All returned collections/objects are readonly through the shared interface. */
export function createFixtureF1DataProvider(
  options: FixtureProviderOptions = {},
): F1DataProvider {
  const scenario = options.scenario ?? "success";
  const metadata: ResponseMetadata = {
    ...sampleMetadata,
    ...(scenario === "partial"
      ? { completeness: "partial", finality: "provisional" }
      : {}),
    ...(scenario === "stale"
      ? {
          freshness: "stale",
          cache: "hit",
          revalidationError: sampleErrors.network,
        }
      : {}),
  };

  function failure<T>(code: DataError["code"]): DataResult<T> {
    return {
      status: "error",
      error: sampleErrors[code],
      metadata: { source: sampleSource, attemptedAt: "2099-05-01T12:00:00Z" },
    };
  }

  function unavailable<T>(
    reason: "unknown-season" | "unknown-event" | "not-covered",
  ): DataResult<T> {
    return {
      status: "unavailable",
      reason,
      metadata: { ...metadata, completeness: "unknown", finality: "unknown" },
    };
  }

  function validate<T>(
    request: SeasonRequest | EventRequest,
  ): DataResult<T> | undefined {
    try {
      createEventId(request.season, "round" in request ? request.round : 1);
    } catch {
      return failure("invalid-request");
    }
    if (request.season !== FIXTURE_SEASON) return unavailable("unknown-season");
    if ("round" in request && request.round !== 1 && request.round !== 2) {
      return unavailable("unknown-event");
    }
    return undefined;
  }

  function result<T>(data: T): DataResult<T> {
    if (scenario === "error") return failure(options.errorCode ?? "network");
    if (scenario === "empty")
      return { status: "empty", reason: "no-entries", metadata };
    if (
      scenario === "not-published" ||
      scenario === "not-covered" ||
      scenario === "cancelled"
    ) {
      return {
        status: "unavailable",
        reason: scenario,
        metadata: { ...metadata, completeness: "unknown", finality: "unknown" },
      };
    }
    return { status: "success", data, metadata };
  }

  function event(round: number): GrandPrix {
    const selected = round === 1 ? sampleRegularEvent : sampleSprintEvent;
    if (scenario === "partial")
      return {
        ...sampleIncompleteEvent,
        ...selected,
        sessions: sampleIncompleteEvent.sessions,
        date: sampleIncompleteEvent.date,
      };
    if (
      scenario === "missing-qualifying" &&
      selected.sessions.status === "available"
    ) {
      return {
        ...selected,
        sessions: available(
          selected.sessions.value.filter((item) => item.kind !== "qualifying"),
        ),
      };
    }
    return selected;
  }

  return {
    async getSupportedSeasons() {
      return result([
        {
          ...sampleSeason,
          events: available([event(1), event(2)]),
        },
      ]);
    },
    async getSeasonCalendar(request) {
      return (
        validate<readonly GrandPrix[]>(request) ?? result([event(1), event(2)])
      );
    },
    async getDriverStandings(request) {
      return (
        validate<readonly DriverStanding[]>(request) ??
        result(sampleDriverStandings)
      );
    },
    async getConstructorStandings(request) {
      return (
        validate<readonly ConstructorStanding[]>(request) ??
        result(sampleConstructorStandings)
      );
    },
    async getEventDetails(request) {
      return validate<GrandPrix>(request) ?? result(event(request.round));
    },
    async getRaceResults(request) {
      return (
        validate<readonly RaceResult[]>(request) ??
        result(
          sampleRaceResults.map((row) => ({
            ...row,
            sessionId: createSessionId(
              createEventId(request.season, request.round),
              "race",
            ),
          })),
        )
      );
    },
    async getQualifyingResults(request) {
      const invalid = validate<readonly QualifyingResult[]>(request);
      if (invalid) return invalid;
      if (scenario === "missing-qualifying") return unavailable("not-covered");
      return result(
        sampleQualifyingResults.map((row) => ({
          ...row,
          sessionId: createSessionId(
            createEventId(request.season, request.round),
            "qualifying",
          ),
        })),
      );
    },
  };
}

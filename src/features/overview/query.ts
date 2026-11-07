import type { GrandPrix, Season } from "@/types/f1";
import { createEventId } from "@/types/f1-identifiers";
import type { DataResult, F1DataProvider } from "@/types/f1-provider";
import type { OverviewModel, OverviewRequest } from "./types";

function unavailable<T>(
  result: DataResult<unknown>,
  reason: "unknown-season" | "not-covered" = "not-covered",
): DataResult<T> {
  if (result.status !== "success") return result;
  return { status: "unavailable", reason, metadata: result.metadata };
}

function raceStatus(event: GrandPrix) {
  return event.sessions.status === "available"
    ? event.sessions.value.find((session) => session.kind === "race")?.status
    : undefined;
}

function chronological(events: readonly GrandPrix[], direction: 1 | -1) {
  const allDatesKnown = events.every(
    (event) => event.date.status === "available",
  );
  return events.toSorted((left, right) => {
    if (
      allDatesKnown &&
      left.date.status === "available" &&
      right.date.status === "available"
    ) {
      return (
        direction *
        (left.date.value.localeCompare(right.date.value) ||
          left.round - right.round)
      );
    }
    return direction * (left.round - right.round);
  });
}

function nextCalendarEvent(
  calendar: DataResult<readonly GrandPrix[]>,
  today: string,
): DataResult<GrandPrix> {
  if (calendar.status !== "success") return calendar;
  const candidates = calendar.data.filter((event) => {
    const status = raceStatus(event);
    return (
      status === "scheduled" ||
      ((status === undefined || status === "unknown") &&
        event.date.status === "available" &&
        event.date.value >= today)
    );
  });
  const event = chronological(candidates, 1)[0];
  if (event)
    return { status: "success", data: event, metadata: calendar.metadata };
  // A partial calendar or unknown dates/status cannot confirm an empty schedule.
  if (
    calendar.metadata.completeness !== "complete" ||
    calendar.data.some(
      (item) =>
        raceStatus(item) === undefined || raceStatus(item) === "unknown",
    )
  ) {
    return unavailable(calendar);
  }
  return { status: "empty", reason: "no-entries", metadata: calendar.metadata };
}

/** Bounded sequential probes share the injected provider's cache/request budget. */
const RECENT_RESULT_LOOKUP_LIMIT = 3;

async function recentAvailableRace(
  provider: F1DataProvider,
  calendar: DataResult<readonly GrandPrix[]>,
  today: string,
): Promise<Pick<OverviewModel, "recentRaceState" | "recentRace">> {
  if (calendar.status !== "success")
    return { recentRaceState: calendar, recentRace: null };
  const candidates = chronological(
    calendar.data.filter((event) => {
      const status = raceStatus(event);
      return (
        status === "completed" ||
        ((status === undefined || status === "unknown") &&
          event.date.status === "available" &&
          event.date.value < today)
      );
    }),
    -1,
  ).slice(0, RECENT_RESULT_LOOKUP_LIMIT);
  let newestOutcome: OverviewModel["recentRace"] = null;
  for (const event of candidates) {
    const results = await provider.getRaceResults({
      season: event.season,
      round: event.round,
    });
    newestOutcome ??= { event, results };
    if (results.status === "success" && results.data.length > 0) {
      return {
        recentRaceState: {
          status: "success",
          data: event,
          metadata: calendar.metadata,
        },
        recentRace: { event, results },
      };
    }
    // Do not hide operational failure by searching older events or spend the
    // remaining budget during a provider-wide timeout/rate-limit cooldown.
    if (results.status === "error") {
      return {
        recentRaceState: {
          status: "success",
          data: event,
          metadata: calendar.metadata,
        },
        recentRace: { event, results },
      };
    }
  }
  if (newestOutcome) {
    return {
      recentRaceState: {
        status: "success",
        data: newestOutcome.event,
        metadata: calendar.metadata,
      },
      recentRace: newestOutcome,
    };
  }
  return {
    recentRaceState: unavailable(calendar),
    recentRace: null,
  };
}

function chooseSeason(
  seasons: DataResult<readonly Season[]>,
  request: OverviewRequest,
): { season: number | null; selection: OverviewModel["selection"] } {
  if (request.season !== undefined) {
    return { season: request.season, selection: "requested" };
  }
  if (seasons.status !== "success") {
    return { season: null, selection: "unavailable" };
  }
  const current = new Date(request.now ?? Date.now()).getUTCFullYear();
  if (seasons.data.some((item) => item.year === current)) {
    return { season: current, selection: "current" };
  }
  const latest = seasons.data.toSorted((a, b) => b.year - a.year)[0];
  return latest
    ? { season: latest.year, selection: "latest-supported" }
    : { season: null, selection: "unavailable" };
}

/**
 * Provider-independent orchestration. Import the server.ts entry in application
 * code; this pure module is separate so deterministic tests need no Next runtime.
 * Expected failures remain typed outcomes; programmer exceptions are not hidden.
 */
export async function queryOverview(
  provider: F1DataProvider,
  request: OverviewRequest = {},
): Promise<OverviewModel> {
  if (request.season !== undefined) createEventId(request.season, 1);
  if (request.now !== undefined && !Number.isFinite(Date.parse(request.now))) {
    throw new RangeError(
      "Overview reference time must be a valid UTC instant.",
    );
  }
  const seasons = await provider.getSupportedSeasons();
  const selected = chooseSeason(seasons, request);
  if (selected.season === null) {
    const state = unavailable<never>(seasons, "unknown-season");
    return {
      ...selected,
      requestedSeason: request.season,
      seasons,
      calendar: state,
      drivers: state,
      constructors: state,
      nextEvent: state,
      recentRaceState: state,
      recentRace: null,
    };
  }
  const seasonRequest = { season: selected.season };
  const [calendar, drivers, constructors] = await Promise.all([
    provider.getSeasonCalendar(seasonRequest),
    provider.getDriverStandings(seasonRequest),
    provider.getConstructorStandings(seasonRequest),
  ]);
  // Compare date-only values at day precision; never manufacture a UTC start or
  // completion instant from a source calendar date.
  const today = new Date(request.now ?? Date.now()).toISOString().slice(0, 10);
  const nextEvent = nextCalendarEvent(calendar, today);
  const { recentRaceState, recentRace } = await recentAvailableRace(
    provider,
    calendar,
    today,
  );
  return {
    ...selected,
    requestedSeason: request.season,
    seasons,
    calendar,
    drivers,
    constructors,
    nextEvent,
    recentRaceState,
    recentRace,
  };
}

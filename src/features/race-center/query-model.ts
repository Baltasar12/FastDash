import { SESSION_KINDS } from "@/types/f1";
import type { QualifyingResult, RaceResult } from "@/types/f1";
import { createEventId, createSessionId } from "@/types/f1-identifiers";
import type {
  DataResult,
  F1DataProvider,
  ResponseMetadata,
} from "@/types/f1-provider";
import type { RaceCenterModel, RaceCenterSelection } from "./types";

export interface RaceCenterQueryOptions {
  /** Genuine query-attempt instant; inject a deterministic UTC clock in tests. */
  readonly now?: () => string;
}

function contextError<T>(
  metadata: ResponseMetadata,
  attemptedAt: string,
): DataResult<T> {
  return {
    status: "error",
    error: {
      code: "invalid-response",
      message:
        "The returned data does not match the requested event or session.",
      retryable: false,
    },
    metadata: { source: metadata.source, attemptedAt },
  };
}

function checkRows<T extends RaceResult | QualifyingResult>(
  result: DataResult<readonly T[]>,
  season: number,
  round: number,
  kind: "race" | "qualifying",
  attemptedAt: string,
): DataResult<readonly T[]> {
  if (result.status !== "success") return result;
  const id = createSessionId(createEventId(season, round), kind);
  return result.data.every(
    (row) => row.sessionId === id && row.driver.season === season,
  )
    ? result
    : contextError(result.metadata, attemptedAt);
}

/**
 * Server composition boundary. The host explicitly supplies a real or preview
 * provider. There is no fixture import, network call, cache or fallback here.
 */
export async function loadRaceCenter(
  provider: F1DataProvider,
  selection: RaceCenterSelection = {},
  options: RaceCenterQueryOptions = {},
): Promise<RaceCenterModel> {
  const attemptedAt = (options.now ?? (() => new Date().toISOString()))();
  const seasons = await provider.getSupportedSeasons();
  const initial: RaceCenterModel = { selection, seasons };
  if (
    selection.invalid ||
    (selection.season !== undefined &&
      (!Number.isSafeInteger(selection.season) ||
        selection.season < 1950 ||
        selection.season > 9999)) ||
    (selection.round !== undefined &&
      (!Number.isSafeInteger(selection.round) || selection.round < 1)) ||
    (selection.session !== undefined &&
      !SESSION_KINDS.some((kind) => kind === selection.session))
  ) {
    return {
      ...initial,
      selectionError: "Choose a valid season, Grand Prix and session selector.",
    };
  }
  if (seasons.status !== "success") return initial;
  const season =
    selection.season ??
    [...seasons.data].sort((a, b) => b.year - a.year)[0]?.year;
  if (season === undefined) return initial;
  if (!seasons.data.some((item) => item.year === season)) {
    return {
      ...initial,
      selectionError: "This season is not available. Choose a listed season.",
    };
  }
  const selected: RaceCenterSelection = { ...selection, season };
  const calendar = await provider.getSeasonCalendar({ season });
  const withCalendar: RaceCenterModel = {
    selection: selected,
    seasons,
    calendar,
  };
  if (calendar.status !== "success") return withCalendar;
  if (
    calendar.data.some(
      (event) =>
        event.season !== season ||
        event.id !== createEventId(season, event.round),
    )
  ) {
    return {
      ...withCalendar,
      calendar: contextError(calendar.metadata, attemptedAt),
    };
  }
  const round =
    selection.round ??
    [...calendar.data].sort((a, b) => a.round - b.round)[0]?.round;
  if (round === undefined) return withCalendar;
  if (!calendar.data.some((item) => item.round === round)) {
    return {
      ...withCalendar,
      selectionError:
        "This Grand Prix is not listed. Choose an available event.",
    };
  }
  const eventResult = await provider.getEventDetails({ season, round });
  const withEvent: RaceCenterModel = {
    ...withCalendar,
    selection: { ...selected, round },
    event: eventResult,
  };
  if (eventResult.status !== "success") return withEvent;
  const event = eventResult.data;
  if (
    event.id !== createEventId(season, round) ||
    event.season !== season ||
    event.round !== round ||
    (event.sessions.status === "available" &&
      event.sessions.value.some(
        (session) =>
          session.eventId !== event.id ||
          session.id !== createSessionId(event.id, session.kind),
      ))
  ) {
    return {
      ...withEvent,
      event: contextError(eventResult.metadata, attemptedAt),
    };
  }
  // A calendar describes reported sessions, not every available result dataset.
  // Only an explicit main-qualifying request may probe this independent coverage.
  // Keep session absent: a successful result does not establish a scheduled time.
  if (
    selection.session === "qualifying" &&
    (event.sessions.status !== "available" ||
      !event.sessions.value.some((item) => item.kind === "qualifying"))
  ) {
    const result = await provider.getQualifyingResults({ season, round });
    return {
      ...withEvent,
      selection: { ...selected, round, session: "qualifying" },
      results: {
        kind: "qualifying",
        result: checkRows(result, season, round, "qualifying", attemptedAt),
      },
    };
  }
  if (event.sessions.status !== "available") {
    return {
      ...withEvent,
      results: {
        kind: "unsupported",
        reason:
          "Session information is unavailable for this event. No sessions have been assumed.",
      },
    };
  }
  const session = selection.session
    ? event.sessions.value.find((item) => item.kind === selection.session)
    : (event.sessions.value.find((item) => item.kind === "race") ??
      event.sessions.value[0]);
  if (!session) {
    return {
      ...withEvent,
      selectionError: selection.session
        ? "This session was not reported for this event. Choose a listed session."
        : undefined,
      results: {
        kind: "unsupported",
        reason: "No sessions were reported for this event.",
      },
    };
  }
  const withSession: RaceCenterModel = {
    ...withEvent,
    selection: { ...selected, round, session: session.kind },
    session,
  };
  if (session.status === "cancelled") {
    return {
      ...withSession,
      results: {
        kind: "unsupported",
        reason: "This session was cancelled. Results are unavailable.",
      },
    };
  }
  if (session.kind === "race") {
    const result = await provider.getRaceResults({ season, round });
    return {
      ...withSession,
      results: {
        kind: "race",
        result: checkRows(result, season, round, "race", attemptedAt),
      },
    };
  }
  if (session.kind === "qualifying") {
    const result = await provider.getQualifyingResults({ season, round });
    return {
      ...withSession,
      results: {
        kind: "qualifying",
        result: checkRows(result, season, round, "qualifying", attemptedAt),
      },
    };
  }
  return {
    ...withSession,
    results: {
      kind: "unsupported",
      reason:
        "Results for this session type are unavailable. Main-race and qualifying results are supported; practice and sprint results are not.",
    },
  };
}

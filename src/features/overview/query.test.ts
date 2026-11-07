import { describe, expect, it, vi } from "vitest";
import {
  available,
  FIXTURE_SEASON,
  sampleIncompleteEvent,
  sampleRegularEvent,
  sampleSeason,
  sampleSprintEvent,
} from "@/data/fixtures/f1";
import { createFixtureF1DataProvider } from "@/data/fixtures/fixture-provider";
import { sampleMetadata } from "@/data/fixtures/results";
import type { GrandPrix, Season, Session } from "@/types/f1";
import type { DataResult, F1DataProvider } from "@/types/f1-provider";
import { queryOverview } from "./query";
import { createEventId } from "@/types/f1-identifiers";

const now = "2099-04-20T12:00:00Z";

function success<T>(data: T): DataResult<T> {
  return { status: "success", data, metadata: sampleMetadata };
}

function provider(overrides: Partial<F1DataProvider> = {}): F1DataProvider {
  return { ...createFixtureF1DataProvider(), ...overrides };
}

function withRaceStatus(
  event: GrandPrix,
  status: Session["status"],
): GrandPrix {
  if (event.sessions.status !== "available") return event;
  return {
    ...event,
    sessions: available(
      event.sessions.value.map((session) =>
        session.kind === "race" ? { ...session, status } : session,
      ),
    ),
  };
}

describe("Overview provider query", () => {
  it("uses the requested season and preserves independent provider outcomes", async () => {
    const calendar = vi.fn(async () => success([sampleRegularEvent]));
    const model = await queryOverview(
      provider({ getSeasonCalendar: calendar }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.season).toBe(FIXTURE_SEASON);
    expect(model.selection).toBe("requested");
    expect(calendar).toHaveBeenCalledWith({ season: FIXTURE_SEASON });
    expect(model.drivers.status).toBe("success");
    expect(model.constructors.status).toBe("success");
    expect(model.recentRace?.event.id).toBe(sampleRegularEvent.id);
    expect(model.recentRace?.results.status).toBe("success");
  });

  it("selects the current supported season before the latest supported season", async () => {
    const seasons: readonly Season[] = [
      { ...sampleSeason, year: 2100 },
      sampleSeason,
    ];
    const model = await queryOverview(
      provider({ getSupportedSeasons: async () => success(seasons) }),
      { now },
    );
    expect(model.season).toBe(FIXTURE_SEASON);
    expect(model.selection).toBe("current");
  });

  it("explicitly identifies the latest available season when current is unsupported", async () => {
    const model = await queryOverview(createFixtureF1DataProvider(), {
      now: "2026-11-06T12:00:00Z",
    });
    expect(model.season).toBe(FIXTURE_SEASON);
    expect(model.selection).toBe("latest-supported");
  });

  it("does not replace an unavailable requested season with a synthetic season", async () => {
    const model = await queryOverview(createFixtureF1DataProvider(), {
      season: 2026,
      now,
    });
    expect(model.requestedSeason).toBe(2026);
    expect(model.season).not.toBe(FIXTURE_SEASON);
    expect(model.calendar.status).toBe("unavailable");
    expect(model.drivers.status).toBe("unavailable");
    expect(model.recentRace).toBeNull();
  });

  it.each(["empty", "not-covered", "not-published", "error"] as const)(
    "keeps %s discovery distinct from successful data",
    async (scenario) => {
      const model = await queryOverview(
        createFixtureF1DataProvider({ scenario }),
        { now },
      );
      expect(model.seasons.status).toBe(
        scenario === "not-covered" || scenario === "not-published"
          ? "unavailable"
          : scenario,
      );
      expect(model.recentRace).toBeNull();
    },
  );

  it("preserves a standings failure while other modules succeed", async () => {
    const failure = await createFixtureF1DataProvider({
      scenario: "error",
      errorCode: "rate-limited",
    }).getDriverStandings({ season: FIXTURE_SEASON });
    const model = await queryOverview(
      provider({ getDriverStandings: async () => failure }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.drivers).toEqual(failure);
    expect(model.calendar.status).toBe("success");
    expect(model.constructors.status).toBe("success");
    expect(model.recentRace?.results.status).toBe("success");
  });

  it("selects only a scheduled main race for the next event", async () => {
    const scheduled = withRaceStatus(sampleSprintEvent, "scheduled");
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () => success([scheduled, sampleRegularEvent]),
      }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.nextEvent.status).toBe("success");
    if (model.nextEvent.status === "success") {
      expect(model.nextEvent.data.id).toBe(scheduled.id);
      expect(model.nextEvent.data.sessions).toEqual(scheduled.sessions);
    }
    expect(model.recentRace?.event.id).toBe(sampleRegularEvent.id);
  });

  it.each(["cancelled"] as const)(
    "does not present a %s race as the next event or a completed result",
    async (status) => {
      const getRaceResults = vi.fn(
        createFixtureF1DataProvider().getRaceResults,
      );
      const model = await queryOverview(
        provider({
          getSeasonCalendar: async () =>
            success([withRaceStatus(sampleSprintEvent, status)]),
          getRaceResults,
        }),
        { season: FIXTURE_SEASON, now },
      );
      expect(model.nextEvent.status).not.toBe("success");
      expect(model.recentRace).toBeNull();
      expect(getRaceResults).not.toHaveBeenCalled();
    },
  );

  it("does not infer race completion from dates or invent absent sessions", async () => {
    const getRaceResults = vi.fn(createFixtureF1DataProvider().getRaceResults);
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () => success([sampleIncompleteEvent]),
        getRaceResults,
      }),
      { season: FIXTURE_SEASON, now: "2100-01-01T00:00:00Z" },
    );
    expect(model.nextEvent.status).toBe("unavailable");
    expect(model.recentRace).toBeNull();
    expect(getRaceResults).not.toHaveBeenCalled();
  });

  it("selects the next calendar date with unknown status and discovers published past results", async () => {
    const past = withRaceStatus(sampleRegularEvent, "unknown");
    const next = withRaceStatus(sampleSprintEvent, "unknown");
    const getRaceResults = vi.fn(createFixtureF1DataProvider().getRaceResults);
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () => success([next, past]),
        getRaceResults,
      }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.nextEvent.status).toBe("success");
    if (model.nextEvent.status === "success")
      expect(model.nextEvent.data).toEqual(next);
    expect(model.recentRace?.event).toEqual(past);
    expect(model.recentRace?.results.status).toBe("success");
    expect(getRaceResults).toHaveBeenCalledExactlyOnceWith({
      season: FIXTURE_SEASON,
      round: 1,
    });
    expect(past.sessions).toEqual(
      withRaceStatus(sampleRegularEvent, "unknown").sessions,
    );
  });

  it("keeps today's date on the calendar without inferring a race start or published results", async () => {
    const today = {
      ...withRaceStatus(sampleRegularEvent, "unknown"),
      date: available("2099-04-20"),
    };
    const getRaceResults = vi.fn(createFixtureF1DataProvider().getRaceResults);
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () => success([today]),
        getRaceResults,
      }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.nextEvent.status).toBe("success");
    expect(model.recentRace).toBeNull();
    expect(getRaceResults).not.toHaveBeenCalled();
  });

  it("probes older past events only when the newer result is not published", async () => {
    const newer = {
      ...withRaceStatus(sampleSprintEvent, "unknown"),
      date: available("2099-04-19"),
    };
    const getRaceResults = vi.fn(
      async (request: { season: number; round: number }) =>
        request.round === 2
          ? {
              status: "unavailable" as const,
              reason: "not-published" as const,
              metadata: sampleMetadata,
            }
          : createFixtureF1DataProvider().getRaceResults(request),
    );
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () =>
          success([withRaceStatus(sampleRegularEvent, "unknown"), newer]),
        getRaceResults,
      }),
      { season: FIXTURE_SEASON, now },
    );
    expect(getRaceResults.mock.calls.map(([request]) => request.round)).toEqual(
      [2, 1],
    );
    expect(model.recentRace?.event.round).toBe(1);
    expect(model.recentRace?.results.status).toBe("success");
  });

  it.each([
    "not-published",
    "empty",
    "network",
    "timeout",
    "rate-limited",
  ] as const)(
    "retains %s results and stops operational-failure probes",
    async (scenario) => {
      const fixture = createFixtureF1DataProvider({
        scenario:
          scenario === "empty"
            ? "empty"
            : scenario === "not-published"
              ? "not-published"
              : "error",
        errorCode:
          scenario === "network" ||
          scenario === "timeout" ||
          scenario === "rate-limited"
            ? scenario
            : undefined,
      });
      const expected = await fixture.getRaceResults({
        season: FIXTURE_SEASON,
        round: 1,
      });
      const getRaceResults = vi.fn(async () => expected);
      const past = withRaceStatus(sampleRegularEvent, "unknown");
      const model = await queryOverview(
        provider({
          getSeasonCalendar: async () => success([past]),
          getRaceResults,
        }),
        { season: FIXTURE_SEASON, now },
      );
      expect(model.recentRace?.results).toEqual(expected);
      expect(model.recentRace?.event).toEqual(past);
      expect(getRaceResults).toHaveBeenCalledTimes(1);
    },
  );

  it("bounds historical publication probes to three and preserves the newest unavailable outcome", async () => {
    const events = Array.from({ length: 5 }, (_, index): GrandPrix => ({
      ...withRaceStatus(sampleRegularEvent, "unknown"),
      id: createEventId(FIXTURE_SEASON, index + 1),
      round: index + 1,
      date: available(`2099-04-${String(index + 10).padStart(2, "0")}`),
    }));
    const getRaceResults = vi.fn(async () => ({
      status: "unavailable" as const,
      reason: "not-published" as const,
      metadata: sampleMetadata,
    }));
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () => success(events),
        getRaceResults,
      }),
      { season: FIXTURE_SEASON, now },
    );
    expect(getRaceResults).toHaveBeenCalledTimes(3);
    expect(model.recentRace?.event.round).toBe(5);
    expect(model.recentRace?.results.status).toBe("unavailable");
  });

  it("stops further historical probes after a rate-limit response", async () => {
    const failure = await createFixtureF1DataProvider({
      scenario: "error",
      errorCode: "rate-limited",
    }).getRaceResults({ season: FIXTURE_SEASON, round: 1 });
    const getRaceResults = vi.fn(async () => failure);
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () =>
          success([sampleRegularEvent, sampleSprintEvent]),
        getRaceResults,
      }),
      { season: FIXTURE_SEASON, now },
    );
    expect(getRaceResults).toHaveBeenCalledTimes(1);
    expect(model.recentRace?.results).toEqual(failure);
  });

  it("keeps partial and provisional calendar metadata without asserting full coverage", async () => {
    const model = await queryOverview(
      createFixtureF1DataProvider({ scenario: "partial" }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.calendar.status).toBe("success");
    if (model.calendar.status === "success") {
      expect(model.calendar.metadata.completeness).toBe("partial");
      expect(model.calendar.metadata.finality).toBe("provisional");
    }
    expect(model.nextEvent.status).toBe("unavailable");
    expect(model.recentRace).toBeNull();
  });

  it("retains original stale provenance and revalidation failure", async () => {
    const model = await queryOverview(
      createFixtureF1DataProvider({ scenario: "stale" }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.drivers.status).toBe("success");
    if (model.drivers.status === "success") {
      expect(model.drivers.metadata.freshness).toBe("stale");
      expect(model.drivers.metadata.retrievedAt).toBe(
        sampleMetadata.retrievedAt,
      );
      expect(model.drivers.metadata.revalidationError?.code).toBe("network");
    }
  });

  it("does not mask programmer errors as an operational error or fixture fallback", async () => {
    const defect = new Error("synthetic programmer defect");
    await expect(
      queryOverview(
        provider({
          getSeasonCalendar: async () => {
            throw defect;
          },
        }),
        { season: FIXTURE_SEASON, now },
      ),
    ).rejects.toThrow(defect);
  });

  it("uses reported chronology when completed events are rescheduled across rounds", async () => {
    const rescheduled = {
      ...sampleRegularEvent,
      date: available("2099-05-10"),
      sessions:
        sampleRegularEvent.sessions.status === "available"
          ? available(
              sampleRegularEvent.sessions.value.map((session) => ({
                ...session,
                start:
                  session.kind === "race"
                    ? available({
                        precision: "date" as const,
                        date: "2099-05-10",
                      })
                    : session.start,
              })),
            )
          : sampleRegularEvent.sessions,
    };
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () =>
          success([sampleSprintEvent, rescheduled]),
      }),
      { season: FIXTURE_SEASON, now: "2099-05-20T12:00:00Z" },
    );
    expect(model.recentRace?.event.id).toBe(sampleRegularEvent.id);
  });

  it("can confirm past race results independently without inventing an absent calendar session", async () => {
    const event = {
      ...sampleRegularEvent,
      sessions:
        sampleRegularEvent.sessions.status === "available"
          ? available(
              sampleRegularEvent.sessions.value.filter(
                (session) => session.kind !== "race",
              ),
            )
          : sampleRegularEvent.sessions,
    };
    const model = await queryOverview(
      provider({
        getSeasonCalendar: async () => success([event]),
      }),
      { season: FIXTURE_SEASON, now },
    );
    expect(model.nextEvent.status).toBe("unavailable");
    expect(model.recentRace?.results.status).toBe("success");
    expect(model.recentRace?.event.sessions).toEqual(event.sessions);
  });

  it.each([NaN, Infinity, -1, 2099.5])(
    "rejects invalid season %s before contacting a provider",
    async (season) => {
      const discovery = vi.fn(
        createFixtureF1DataProvider().getSupportedSeasons,
      );
      await expect(
        queryOverview(provider({ getSupportedSeasons: discovery }), {
          season,
          now,
        }),
      ).rejects.toThrow();
      expect(discovery).not.toHaveBeenCalled();
    },
  );
});

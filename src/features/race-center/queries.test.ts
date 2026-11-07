import { describe, expect, it, vi } from "vitest";
import { createFixtureF1DataProvider } from "@/data/fixtures/fixture-provider";
import {
  available,
  FIXTURE_SEASON,
  sampleRaceResults,
  sampleRaceWinner,
  sampleQualifyingResults,
  sampleRegularEvent,
  sampleSeason,
  sampleSprintEvent,
} from "@/data/fixtures/f1";
import { sampleMetadata } from "@/data/fixtures/results";
import type { GrandPrix, RaceResult } from "@/types/f1";
import type { DataResult, F1DataProvider } from "@/types/f1-provider";
import { loadRaceCenter } from "./query-model";
import { parseRaceCenterSelection } from "./selection";

function success<T>(data: T): DataResult<T> {
  return { status: "success", data, metadata: sampleMetadata };
}

function observedProvider(overrides: Partial<F1DataProvider> = {}) {
  const fixture = createFixtureF1DataProvider();
  return {
    ...fixture,
    getSeasonCalendar: vi.fn(fixture.getSeasonCalendar),
    getEventDetails: vi.fn(fixture.getEventDetails),
    getRaceResults: vi.fn(fixture.getRaceResults),
    getQualifyingResults: vi.fn(fixture.getQualifyingResults),
    ...overrides,
  };
}

describe("Race Center provider-independent queries", () => {
  it("loads a reported race and preserves its normalized data and provenance", async () => {
    const provider = observedProvider();
    const model = await loadRaceCenter(provider);
    expect(model.selection).toEqual({
      season: FIXTURE_SEASON,
      round: 1,
      session: "race",
    });
    expect(provider.getRaceResults).toHaveBeenCalledWith({
      season: FIXTURE_SEASON,
      round: 1,
    });
    expect(model.results).toEqual({
      kind: "race",
      result: success(sampleRaceResults),
    });
    expect(provider.getQualifyingResults).not.toHaveBeenCalled();
  });

  it("selects main qualifying independently of sprint qualifying", async () => {
    const provider = observedProvider();
    const model = await loadRaceCenter(provider, {
      season: FIXTURE_SEASON,
      round: 2,
      session: "qualifying",
    });
    expect(model.session?.id).toBe("f1:2099:2:qualifying");
    expect(model.results?.kind).toBe("qualifying");
    expect(provider.getQualifyingResults).toHaveBeenCalledOnce();
    expect(provider.getRaceResults).not.toHaveBeenCalled();
  });

  it.each(["sprint", "sprint-qualifying", "practice-1"] as const)(
    "keeps %s selectable but does not substitute a main-race result method",
    async (session) => {
      const provider = observedProvider();
      const model = await loadRaceCenter(provider, {
        season: FIXTURE_SEASON,
        round: 2,
        session,
      });
      expect(model.session?.kind).toBe(session);
      expect(model.results?.kind).toBe("unsupported");
      expect(provider.getRaceResults).not.toHaveBeenCalled();
      expect(provider.getQualifyingResults).not.toHaveBeenCalled();
    },
  );

  it("rejects an unreported session rather than synthesizing weekend sessions", async () => {
    const provider = observedProvider();
    const model = await loadRaceCenter(provider, {
      season: FIXTURE_SEASON,
      round: 2,
      session: "practice-3",
    });
    expect(model.selectionError).toBeTruthy();
    expect(model.session).toBeUndefined();
    expect(provider.getRaceResults).not.toHaveBeenCalled();
    expect(provider.getQualifyingResults).not.toHaveBeenCalled();
  });

  it("loads explicitly requested qualifying results missing from the reported calendar without inventing a session", async () => {
    const fixture = createFixtureF1DataProvider({
      scenario: "missing-qualifying",
    });
    const provider = observedProvider({
      getSeasonCalendar: fixture.getSeasonCalendar,
      getEventDetails: fixture.getEventDetails,
    });
    const model = await loadRaceCenter(
      provider,
      parseRaceCenterSelection({
        season: "2099",
        round: "1",
        session: "qualifying",
      }),
    );
    expect(provider.getQualifyingResults).toHaveBeenCalledExactlyOnceWith({
      season: FIXTURE_SEASON,
      round: 1,
    });
    expect(model.selectionError).toBeUndefined();
    expect(model.session).toBeUndefined();
    expect(model.selection).toEqual({
      season: FIXTURE_SEASON,
      round: 1,
      session: "qualifying",
    });
    expect(model.results).toEqual({
      kind: "qualifying",
      result: success(sampleQualifyingResults),
    });
    expect(model.event).toEqual(
      await fixture.getEventDetails({ season: FIXTURE_SEASON, round: 1 }),
    );
    expect(provider.getRaceResults).not.toHaveBeenCalled();
  });

  it("allows an explicit qualifying dataset request when the session list is unavailable", async () => {
    const fixture = createFixtureF1DataProvider({ scenario: "partial" });
    const provider = observedProvider({
      getEventDetails: fixture.getEventDetails,
    });
    const model = await loadRaceCenter(provider, {
      season: FIXTURE_SEASON,
      round: 1,
      session: "qualifying",
    });
    expect(model.session).toBeUndefined();
    expect(model.results).toEqual({
      kind: "qualifying",
      result: success(sampleQualifyingResults),
    });
    expect(model.event).toMatchObject({
      status: "success",
      data: { sessions: { status: "unavailable", reason: "not-covered" } },
    });
  });

  it.each(["not-published", "empty", "error"] as const)(
    "preserves %s qualifying responses when qualifying is unreported",
    async (scenario) => {
      const calendar = createFixtureF1DataProvider({
        scenario: "missing-qualifying",
      });
      const results = createFixtureF1DataProvider({ scenario });
      const provider = observedProvider({
        getEventDetails: calendar.getEventDetails,
        getQualifyingResults: vi.fn(results.getQualifyingResults),
      });
      const model = await loadRaceCenter(provider, {
        season: FIXTURE_SEASON,
        round: 1,
        session: "qualifying",
      });
      expect(model.selectionError).toBeUndefined();
      expect(model.session).toBeUndefined();
      expect(model.results).toEqual({
        kind: "qualifying",
        result: await results.getQualifyingResults({
          season: FIXTURE_SEASON,
          round: 1,
        }),
      });
      expect(provider.getQualifyingResults).toHaveBeenCalledOnce();
      expect(provider.getRaceResults).not.toHaveBeenCalled();
    },
  );

  it("retains a genuinely unavailable qualifying dataset without adding it to the schedule", async () => {
    const fixture = createFixtureF1DataProvider({
      scenario: "missing-qualifying",
    });
    const provider = observedProvider({
      getEventDetails: fixture.getEventDetails,
      getQualifyingResults: vi.fn(fixture.getQualifyingResults),
    });
    const model = await loadRaceCenter(provider, {
      season: FIXTURE_SEASON,
      round: 1,
      session: "qualifying",
    });
    expect(provider.getQualifyingResults).toHaveBeenCalledOnce();
    expect(model.session).toBeUndefined();
    expect(model.results).toMatchObject({
      kind: "qualifying",
      result: { status: "unavailable", reason: "not-covered" },
    });
  });

  it("does not probe absent qualifying results during default race navigation", async () => {
    const fixture = createFixtureF1DataProvider({
      scenario: "missing-qualifying",
    });
    const provider = observedProvider({
      getEventDetails: fixture.getEventDetails,
    });
    const model = await loadRaceCenter(provider);
    expect(model.session?.kind).toBe("race");
    expect(provider.getQualifyingResults).not.toHaveBeenCalled();
  });

  it("does not request results when reported session coverage is unavailable", async () => {
    const fixture = createFixtureF1DataProvider({ scenario: "partial" });
    const provider = observedProvider({
      getSupportedSeasons: fixture.getSupportedSeasons,
      getSeasonCalendar: fixture.getSeasonCalendar,
      getEventDetails: fixture.getEventDetails,
    });
    const model = await loadRaceCenter(provider);
    expect(model.event?.status).toBe("success");
    expect(model.session).toBeUndefined();
    expect(provider.getRaceResults).not.toHaveBeenCalled();
    expect(provider.getQualifyingResults).not.toHaveBeenCalled();
  });

  it("does not load cancelled-session results", async () => {
    const event: GrandPrix = {
      ...sampleRegularEvent,
      sessions:
        sampleRegularEvent.sessions.status === "available"
          ? available(
              sampleRegularEvent.sessions.value.map((session) => ({
                ...session,
                status: "cancelled" as const,
              })),
            )
          : sampleRegularEvent.sessions,
    };
    const provider = observedProvider({
      getEventDetails: async () => success(event),
    });
    const model = await loadRaceCenter(provider);
    expect(model.session?.status).toBe("cancelled");
    expect(provider.getRaceResults).not.toHaveBeenCalled();
    expect(provider.getQualifyingResults).not.toHaveBeenCalled();
  });

  it("does not replace unknown seasons or rounds with the default selection", async () => {
    const provider = observedProvider();
    const seasonModel = await loadRaceCenter(provider, { season: 2098 });
    expect(seasonModel.selectionError).toBeTruthy();
    expect(provider.getSeasonCalendar).not.toHaveBeenCalled();
    const roundModel = await loadRaceCenter(provider, {
      season: FIXTURE_SEASON,
      round: 99,
    });
    expect(roundModel.selectionError).toBeTruthy();
    expect(provider.getEventDetails).not.toHaveBeenCalled();
    expect(provider.getRaceResults).not.toHaveBeenCalled();
  });

  it("supports season discovery without assuming the fixture year", async () => {
    const priorEvent: GrandPrix = {
      ...sampleRegularEvent,
      id: "f1:2098:1",
      season: 2098,
      sessions: available([]),
    };
    const provider = observedProvider({
      getSupportedSeasons: async () =>
        success([
          sampleSeason,
          { ...sampleSeason, year: 2098, events: available([priorEvent]) },
        ]),
      getSeasonCalendar: vi.fn(async () => success([priorEvent])),
      getEventDetails: vi.fn(async () => success(priorEvent)),
    });
    const model = await loadRaceCenter(provider, { season: 2098 });
    expect(model.selection.season).toBe(2098);
    expect(provider.getSeasonCalendar).toHaveBeenCalledWith({ season: 2098 });
    expect(model.event).toEqual(success(priorEvent));
  });

  it.each([
    "empty",
    "not-published",
    "not-covered",
    "cancelled",
    "error",
  ] as const)(
    "preserves %s during supported-season discovery without cascading calls",
    async (scenario) => {
      const fixture = createFixtureF1DataProvider({ scenario });
      const provider = observedProvider({
        getSupportedSeasons: fixture.getSupportedSeasons,
      });
      const model = await loadRaceCenter(provider);
      expect(model.seasons.status).toBe(
        scenario === "empty" || scenario === "error" ? scenario : "unavailable",
      );
      expect(provider.getSeasonCalendar).not.toHaveBeenCalled();
      expect(provider.getEventDetails).not.toHaveBeenCalled();
      expect(provider.getRaceResults).not.toHaveBeenCalled();
    },
  );

  it.each(["stale", "partial"] as const)(
    "preserves %s results metadata independently of calendar and event metadata",
    async (scenario) => {
      const fixture = createFixtureF1DataProvider({ scenario });
      const model = await loadRaceCenter(
        observedProvider({ getRaceResults: fixture.getRaceResults }),
      );
      expect(model.results?.kind).toBe("race");
      if (
        model.results?.kind !== "race" ||
        model.results.result.status !== "success"
      ) {
        throw new Error("Expected race results");
      }
      expect(model.results.result.metadata).toMatchObject(
        scenario === "stale"
          ? {
              freshness: "stale",
              cache: "hit",
              revalidationError: { code: "network" },
            }
          : { completeness: "partial", finality: "provisional" },
      );
    },
  );

  it("refuses results whose session does not match the selected event", async () => {
    const provider = observedProvider({
      getRaceResults: async () =>
        success<readonly RaceResult[]>([
          { ...sampleRaceWinner, sessionId: "f1:2099:2:race" },
        ]),
    });
    const model = await loadRaceCenter(provider);
    if (model.results?.kind !== "race")
      throw new Error("Expected race response");
    expect(model.results.result).toMatchObject({
      status: "error",
      error: { code: "invalid-response" },
    });
  });

  it("refuses an event response that belongs to another round", async () => {
    const provider = observedProvider({
      getEventDetails: async () => success(sampleSprintEvent),
    });
    const model = await loadRaceCenter(provider);
    expect(model.event).toMatchObject({
      status: "error",
      error: { code: "invalid-response" },
    });
    expect(provider.getRaceResults).not.toHaveBeenCalled();
  });

  it.each(["calendar", "event", "race", "qualifying"] as const)(
    "timestamps a stale mismatched %s response with the current validation attempt and discards mismatched data",
    async (scope) => {
      const attemptedAt = "2099-06-02T15:16:17Z";
      const now = vi.fn(() => attemptedAt);
      const staleMetadata = { ...sampleMetadata, freshness: "stale" as const };
      const calendarResult = {
        status: "success" as const,
        data: [sampleSprintEvent],
        metadata: staleMetadata,
      };
      const eventResult = {
        status: "success" as const,
        data: sampleSprintEvent,
        metadata: staleMetadata,
      };
      const raceResult = {
        status: "success" as const,
        data: [{ ...sampleRaceWinner, sessionId: "f1:2099:2:race" as const }],
        metadata: staleMetadata,
      };
      const qualifyingResult = {
        status: "success" as const,
        data: sampleQualifyingResults.map((row) => ({
          ...row,
          sessionId: "f1:2099:2:qualifying" as const,
        })),
        metadata: staleMetadata,
      };
      const provider = observedProvider({
        ...(scope === "calendar"
          ? {
              getSeasonCalendar: async () => ({
                ...calendarResult,
                data: [{ ...sampleRegularEvent, season: 2098 }],
              }),
            }
          : scope === "event"
            ? { getEventDetails: async () => eventResult }
            : scope === "race"
              ? { getRaceResults: async () => raceResult }
              : { getQualifyingResults: async () => qualifyingResult }),
      });
      const model = await loadRaceCenter(
        provider,
        {
          season: 2099,
          round: 1,
          session: scope === "qualifying" ? "qualifying" : "race",
        },
        { now },
      );
      const rejected =
        scope === "calendar"
          ? model.calendar
          : scope === "event"
            ? model.event
            : model.results?.kind === "race" ||
                model.results?.kind === "qualifying"
              ? model.results.result
              : undefined;
      expect(rejected).toMatchObject({
        status: "error",
        error: { code: "invalid-response", retryable: false },
        metadata: { source: sampleMetadata.source, attemptedAt },
      });
      expect(rejected).not.toHaveProperty("data");
      expect(now).toHaveBeenCalled();
      expect(staleMetadata.retrievedAt).toBe("2099-05-01T12:00:00Z");
      expect(model.seasons).toMatchObject({
        status: "success",
        metadata: { retrievedAt: "2099-05-01T12:00:00Z" },
      });
      if (scope === "calendar" || scope === "event") {
        expect(provider.getRaceResults).not.toHaveBeenCalled();
        expect(provider.getQualifyingResults).not.toHaveBeenCalled();
        expect(model.results).toBeUndefined();
      }
    },
  );

  it("retains numeric zero, retirement, disqualification and absent grid values", async () => {
    const missingGrid: RaceResult = {
      ...sampleRaceWinner,
      grid: { status: "missing" },
    };
    const provider = observedProvider({
      getRaceResults: async () =>
        success([missingGrid, ...sampleRaceResults.slice(1)]),
    });
    const model = await loadRaceCenter(provider);
    if (
      model.results?.kind !== "race" ||
      model.results.result.status !== "success"
    )
      throw new Error("Expected race rows");
    expect(model.results.result.data[0]?.grid).toEqual({ status: "missing" });
    expect(
      model.results.result.data.find(
        (row) => row.finishStatus.kind === "retired",
      )?.points,
    ).toEqual(available(0));
    expect(
      model.results.result.data.find(
        (row) => row.finishStatus.kind === "disqualified",
      )?.classification.text,
    ).toEqual(available("DSQ"));
  });
});

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Driver, FieldValue, RaceResult } from "./f1";
import type { DataResult, DataState, F1DataProvider } from "./f1-provider";
import { createEventId, createSessionId } from "./f1-identifiers";
import {
  FIXTURE_SEASON,
  sampleConstructor,
  sampleDriverEntry,
  sampleDriverStandings,
  sampleIncompleteEvent,
  sampleOtherConstructor,
  sampleOtherFormatQualifying,
  samplePreviousDriverEntry,
  sampleQualifyingResults,
  sampleRaceResults,
  sampleRegularEvent,
  sampleSeason,
  sampleSprintEvent,
} from "@/data/fixtures/f1";
import {
  sampleEmptyResult,
  sampleErrors,
  samplePartialResult,
  sampleStaleResult,
  sampleUnpublishedResult,
} from "@/data/fixtures/results";
import { createFixtureF1DataProvider } from "@/data/fixtures/fixture-provider";

describe("canonical F1 identities", () => {
  it("uses season and round without mutable names or provider IDs", () => {
    expect(createEventId(FIXTURE_SEASON, 1)).toBe(sampleRegularEvent.id);
    expect(createEventId(FIXTURE_SEASON, 2)).not.toBe(sampleRegularEvent.id);
    expect(createEventId(FIXTURE_SEASON - 1, 1)).not.toBe(
      sampleRegularEvent.id,
    );
    expect(createSessionId(sampleRegularEvent.id, "race")).toBe(
      "f1:2099:1:race",
    );
    expect(createSessionId(sampleSprintEvent.id, "sprint")).not.toBe(
      createSessionId(sampleSprintEvent.id, "race"),
    );
  });

  it.each([
    [1949, 1],
    [10000, 1],
    [2099.5, 1],
    [NaN, 1],
    [Infinity, 1],
    [2099, 0],
    [2099, -1],
    [2099, 1.5],
    [2099, Number.MAX_SAFE_INTEGER + 1],
  ])("rejects invalid identity inputs %s / %s", (season, round) => {
    expect(() => createEventId(season, round)).toThrow(RangeError);
  });

  it("validates a structurally typed event ID at runtime too", () => {
    expect(() => createSessionId("f1:2099:0", "race")).toThrow(RangeError);
    expect(() => createSessionId("f1:1949:1", "race")).toThrow(RangeError);
    // @ts-expect-error Unsupported session labels are rejected at compile time too.
    expect(() => createSessionId(sampleRegularEvent.id, "warmup")).toThrow(
      RangeError,
    );
  });
});

describe("synthetic domain fixture integrity", () => {
  it("keeps season-specific numbers and constructor history out of driver identity", () => {
    expect(sampleDriverEntry.driver.id).toBe(
      samplePreviousDriverEntry.driver.id,
    );
    expect(sampleDriverEntry.racingNumber).not.toEqual(
      samplePreviousDriverEntry.racingNumber,
    );
    expect(sampleDriverEntry.driver).not.toHaveProperty("racingNumber");
    expect(sampleDriverStandings[0]?.constructors).toEqual({
      status: "available",
      value: [sampleConstructor, sampleOtherConstructor],
    });
    expect(sampleDriverStandings[0]?.asOfRound).toEqual({
      status: "available",
      value: 2,
    });
    expect(sampleOtherConstructor.visual).toBeUndefined();
  });

  it("keeps dates without time precision and UTC instants distinct", () => {
    expect(sampleRegularEvent.date).toEqual({
      status: "available",
      value: "2099-04-12",
    });
    if (sampleRegularEvent.sessions.status !== "available")
      throw new Error("Fixture sessions missing");
    expect(
      sampleRegularEvent.sessions.value.find(
        (item) => item.kind === "practice-1",
      )?.start,
    ).toEqual({
      status: "available",
      value: { precision: "date", date: "2099-04-10" },
    });
    expect(
      sampleRegularEvent.sessions.value.find((item) => item.kind === "race")
        ?.start,
    ).toEqual({
      status: "available",
      value: { precision: "instant", at: "2099-04-12T14:00:00Z" },
    });
  });

  it("supports different weekend sessions with unique context-correct keys", () => {
    for (const event of [sampleRegularEvent, sampleSprintEvent]) {
      if (event.sessions.status !== "available")
        throw new Error("Fixture sessions missing");
      expect(new Set(event.sessions.value.map((item) => item.id)).size).toBe(
        event.sessions.value.length,
      );
      for (const item of event.sessions.value) {
        expect(item.eventId).toBe(event.id);
        expect(item.id).toBe(createSessionId(event.id, item.kind));
      }
    }
    if (sampleSprintEvent.sessions.status !== "available")
      throw new Error("Fixture sessions missing");
    expect(sampleSprintEvent.sessions.value.map((item) => item.kind)).toEqual([
      "practice-1",
      "sprint-qualifying",
      "sprint",
      "qualifying",
      "race",
    ]);
    expect(sampleIncompleteEvent.sessions).toEqual({
      status: "unavailable",
      reason: "not-covered",
    });
    expect(sampleIncompleteEvent.date).toEqual({ status: "missing" });
  });

  it("preserves race classification and missing data without inventing positions or times", () => {
    const retired = sampleRaceResults.find(
      (row) => row.finishStatus.kind === "retired",
    );
    const dns = sampleRaceResults.find(
      (row) => row.finishStatus.kind === "did-not-start",
    );
    const dsq = sampleRaceResults.find(
      (row) => row.finishStatus.kind === "disqualified",
    );
    expect(retired?.classification).toEqual({
      position: { status: "not-applicable" },
      text: { status: "available", value: "R" },
    });
    expect(retired?.time).toEqual({ status: "not-applicable" });
    expect(dns?.lapsCompleted).toEqual({ status: "available", value: 0 });
    expect(dsq?.lapsCompleted).toEqual({ status: "missing" });
    expect(dsq?.grid).toEqual({
      status: "available",
      value: { kind: "pit-lane" },
    });
    expect(
      sampleRaceResults.some(
        (row) =>
          row.time.status === "available" &&
          row.time.value.kind === "laps-down",
      ),
    ).toBe(true);
    expect(
      sampleRaceResults.some(
        (row) =>
          row.time.status === "available" && row.time.value.kind === "gap",
      ),
    ).toBe(true);
    expect(
      retired?.fastestLap.status === "available" &&
        retired.fastestLap.value.time.status,
    ).toBe("unavailable");
  });

  it("does not fabricate Q2/Q3 for an unrecorded stage or force a three-stage format", () => {
    const noTime = sampleQualifyingResults.find(
      (row) => row.classification.position.status === "missing",
    );
    expect(noTime?.stages.map((stage) => stage.id)).toEqual(["q1"]);
    expect(noTime?.stages[0]?.time).toEqual({
      status: "unavailable",
      reason: "unknown",
    });
    expect(sampleOtherFormatQualifying[0]?.format).toBe("other");
    expect(
      sampleOtherFormatQualifying[0]?.stages.map((stage) => stage.id),
    ).toEqual(["stage:single"]);
  });

  it("retains the distinction between valid empty, unavailable, partial and stale", () => {
    expect(sampleEmptyResult.status).toBe("empty");
    expect(sampleUnpublishedResult).toMatchObject({
      status: "unavailable",
      reason: "not-published",
    });
    expect(sampleEmptyResult).not.toHaveProperty("data");
    expect(sampleUnpublishedResult).not.toHaveProperty("data");
    expect(samplePartialResult).toMatchObject({
      status: "success",
      metadata: { completeness: "partial", finality: "provisional" },
    });
    expect(sampleStaleResult).toMatchObject({
      status: "success",
      metadata: { freshness: "stale", revalidationError: { code: "network" } },
    });
  });

  it("serializes the shared fixtures without Date objects, NaN or unknown-zero substitution", () => {
    const fixtures = {
      sampleSeason,
      sampleRaceResults,
      sampleQualifyingResults,
      sampleIncompleteEvent,
      sampleStaleResult,
    };
    expect(JSON.parse(JSON.stringify(fixtures))).toEqual(fixtures);
    expect(
      new Set(sampleRaceResults.map((row) => row.driver.driver.id)).size,
    ).toBe(sampleRaceResults.length);
    for (const row of sampleRaceResults) {
      expect(row.sessionId).toBe(
        createSessionId(sampleRegularEvent.id, "race"),
      );
      expect(row.driver.season).toBe(FIXTURE_SEASON);
    }
  });
});

describe("strict contract compatibility", () => {
  it("enforces required identity, field presence and provider substitution in typecheck", () => {
    expectTypeOf(createFixtureF1DataProvider()).toExtend<F1DataProvider>();
    expectTypeOf<DataState<readonly RaceResult[]>>().toExtend<{
      readonly status: string;
    }>();
    expectTypeOf<
      Extract<FieldValue<number>, { status: "available" }>
    >().toEqualTypeOf<{
      readonly status: "available";
      readonly value: number;
    }>();
    // @ts-expect-error Identity and nationality are required even when unavailable.
    const incompleteDriver: Driver = {
      givenName: "Missing",
      familyName: "Identity",
    };
    expect(incompleteDriver).not.toHaveProperty("id");
    // @ts-expect-error Unavailable results cannot carry a successful dataset.
    const unavailableWithData: DataResult<readonly RaceResult[]> = {
      status: "unavailable",
      reason: "not-published",
      metadata: sampleUnpublishedResult.metadata,
      data: [],
    };
    expect(unavailableWithData.status).toBe("unavailable");
  });
});

describe("fixture provider behavior", () => {
  it("implements all seven methods with explicit synthetic provenance", async () => {
    const provider = createFixtureF1DataProvider();
    const season = { season: FIXTURE_SEASON };
    const event = { ...season, round: 1 };
    const results = await Promise.all([
      provider.getSupportedSeasons(),
      provider.getSeasonCalendar(season),
      provider.getDriverStandings(season),
      provider.getConstructorStandings(season),
      provider.getEventDetails(event),
      provider.getRaceResults(event),
      provider.getQualifyingResults(event),
    ]);
    for (const result of results) {
      expect(result.status).toBe("success");
      expect(result.metadata.source.kind).toBe("synthetic");
      expect(result.metadata.source.name).toMatch(/SYNTHETIC SAMPLE/);
    }
  });

  it("remaps event-specific results to the requested sprint weekend main race", async () => {
    const provider = createFixtureF1DataProvider();
    const request = { season: FIXTURE_SEASON, round: 2 };
    const race = await provider.getRaceResults(request);
    const qualifying = await provider.getQualifyingResults(request);
    if (race.status !== "success" || qualifying.status !== "success")
      throw new Error("Unexpected fixture failure");
    expect(race.data.every((row) => row.sessionId === "f1:2099:2:race")).toBe(
      true,
    );
    expect(
      qualifying.data.every((row) => row.sessionId === "f1:2099:2:qualifying"),
    ).toBe(true);
  });

  it("distinguishes unknown seasons/events from invalid input and unpublished results", async () => {
    const provider = createFixtureF1DataProvider();
    expect(await provider.getSeasonCalendar({ season: 2098 })).toMatchObject({
      status: "unavailable",
      reason: "unknown-season",
    });
    expect(
      await provider.getEventDetails({ season: FIXTURE_SEASON, round: 3 }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-event" });
    expect(
      await provider.getRaceResults({ season: FIXTURE_SEASON, round: 0 }),
    ).toMatchObject({ status: "error", error: { code: "invalid-request" } });
    expect(
      await createFixtureF1DataProvider({
        scenario: "not-published",
      }).getRaceResults({ season: FIXTURE_SEASON, round: 1 }),
    ).toMatchObject({ status: "unavailable", reason: "not-published" });
    expect(
      await createFixtureF1DataProvider({ scenario: "empty" }).getRaceResults({
        season: FIXTURE_SEASON,
        round: 1,
      }),
    ).toMatchObject({ status: "empty", reason: "no-entries" });
  });

  it("provides missing qualifying sessions without manufacturing results", async () => {
    const provider = createFixtureF1DataProvider({
      scenario: "missing-qualifying",
    });
    const request = { season: FIXTURE_SEASON, round: 1 };
    const event = await provider.getEventDetails(request);
    if (
      event.status !== "success" ||
      event.data.sessions.status !== "available"
    )
      throw new Error("Unexpected fixture failure");
    expect(
      event.data.sessions.value.some((item) => item.kind === "qualifying"),
    ).toBe(false);
    expect(await provider.getQualifyingResults(request)).toMatchObject({
      status: "unavailable",
      reason: "not-covered",
    });
  });

  it.each(Object.values(sampleErrors))(
    "returns safe typed operational error $code",
    async (error) => {
      const provider = createFixtureF1DataProvider({
        scenario: "error",
        errorCode: error.code,
      });
      const result = await provider.getRaceResults({
        season: FIXTURE_SEASON,
        round: 1,
      });
      expect(result).toMatchObject({
        status: "error",
        error,
        metadata: {
          source: { kind: "synthetic" },
          attemptedAt: "2099-05-01T12:00:00Z",
        },
      });
      expect(result).not.toHaveProperty("data");
      if (error.code === "rate-limited")
        expect(error.retryAt).toBe("2099-05-01T12:01:00Z");
    },
  );

  it("marks partial and cached stale success independently from transport failure", async () => {
    const request = { season: FIXTURE_SEASON, round: 1 };
    expect(
      await createFixtureF1DataProvider({
        scenario: "partial",
      }).getEventDetails(request),
    ).toMatchObject({
      status: "success",
      data: { date: { status: "missing" } },
      metadata: { completeness: "partial", finality: "provisional" },
    });
    expect(
      await createFixtureF1DataProvider({ scenario: "stale" }).getRaceResults(
        request,
      ),
    ).toMatchObject({
      status: "success",
      metadata: {
        freshness: "stale",
        cache: "hit",
        completeness: "complete",
        revalidationError: { code: "network" },
      },
    });
  });
});

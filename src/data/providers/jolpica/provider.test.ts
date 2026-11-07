import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataResult } from "@/types/f1-provider";
import { createJolpicaProvider } from "./index";
import {
  calendarPage,
  constructor,
  constructorStanding,
  driver,
  driverStanding,
  envelope,
  qualifyingPage,
  qualifyingResult,
  race,
  raceResult,
  resultsPage,
  seasonsPage,
  standingsPage,
} from "./fixtures/wire";

vi.mock("./server-only", () => ({}));

const NOW = Date.parse("2026-11-06T12:00:00.000Z");

function omit(record: Record<string, unknown>, ...keys: readonly string[]) {
  const copy = { ...record };
  for (const key of keys) delete copy[key];
  return copy;
}

function success<T>(result: DataResult<T>) {
  expect(result.status).toBe("success");
  if (result.status !== "success")
    throw new Error(`Expected success: ${result.status}`);
  return result;
}

function errorCode<T>(result: DataResult<T>) {
  expect(result.status).toBe("error");
  if (result.status !== "error")
    throw new Error(`Expected error: ${result.status}`);
  return result.error.code;
}

function harness(
  route: (
    url: URL,
    init?: RequestInit,
  ) => unknown | Response | Promise<unknown | Response>,
  options: Parameters<typeof createJolpicaProvider>[0] = {},
) {
  let current = NOW;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const reply = await route(new URL(String(input)), init);
    return reply instanceof Response ? reply : Response.json(reply);
  });
  const sleep = vi.fn(async (milliseconds: number) => {
    current += milliseconds;
  });
  const provider = createJolpicaProvider({
    fetch: fetchMock,
    now: () => current,
    sleep,
    random: () => 0.5,
    maxRetries: 0,
    ...options,
  });
  return {
    provider,
    fetchMock,
    sleep,
    advance: (milliseconds: number) => {
      current += milliseconds;
    },
  };
}

function standardFallback(url: URL) {
  if (url.pathname.includes("seasons")) return seasonsPage();
  if (url.pathname.endsWith("/races/") || /\/2024\/1\/$/.test(url.pathname))
    return calendarPage();
  throw new Error(`Unexpected fixture path ${url.pathname}`);
}

afterEach(() => vi.useRealTimers());

describe("Jolpica F1DataProvider v1 operations", () => {
  it("discovers supported seasons without inventing calendars or championship metadata", async () => {
    const { provider, fetchMock } = harness(() => seasonsPage([1950, 2024]));
    const result = success(await provider.getSupportedSeasons());
    expect(result.data.map((season) => season.year)).toEqual([1950, 2024]);
    expect(result.data[0]?.events.status).not.toBe("available");
    expect(result.data[0]?.championship.status).not.toBe("available");
    expect(result.metadata).toMatchObject({
      source: { kind: "external" },
      retrievedAt: new Date(NOW).toISOString(),
      freshness: "fresh",
      cache: "miss",
      completeness: "complete",
      finality: "unknown",
    });
    expect(result.metadata.source.attribution.length).toBeGreaterThan(0);
    expect(result.metadata.sourceUpdatedAt).toBeUndefined();
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("User-Agent"),
    ).toMatch(/SECTOR\//i);
  });

  it("normalizes calendar identity and only explicitly reported weekend sessions", async () => {
    const { provider } = harness(() =>
      calendarPage([
        {
          ...race,
          FirstPractice: { date: "2024-03-01", time: "10:00:00Z" },
          SprintShootout: { date: "2024-03-01", time: "13:00:00Z" },
        },
      ]),
    );
    const event = success(await provider.getSeasonCalendar({ season: 2024 }))
      .data[0];
    expect(event).toMatchObject({
      id: "f1:2024:1",
      season: 2024,
      round: 1,
      date: { status: "available", value: "2024-03-02" },
    });
    expect(event?.sessions.status).toBe("available");
    if (event?.sessions.status !== "available")
      throw new Error("Expected reported sessions");
    expect(event.sessions.value.map((session) => session.kind).sort()).toEqual([
      "practice-1",
      "race",
      "sprint-qualifying",
    ]);
    expect(
      event.sessions.value.every((session) => session.status === "unknown"),
    ).toBe(true);
  });

  it("preserves date-only race schedule rather than inventing midnight UTC", async () => {
    const dateOnly = omit(race, "time");
    const { provider } = harness(() => calendarPage([dateOnly]));
    const result = success(
      await provider.getEventDetails({ season: 2024, round: 1 }),
    );
    expect(result.data.id).toBe("f1:2024:1");
    if (result.data.sessions.status !== "available")
      throw new Error("Expected race session");
    expect(result.data.sessions.value).toHaveLength(1);
    expect(result.data.sessions.value[0]?.start).toEqual({
      status: "available",
      value: { precision: "date", date: "2024-03-02" },
    });
  });

  it("normalizes driver standings with fractional points, real zero wins and multiple constructors", async () => {
    const { provider } = harness(() =>
      standingsPage("DriverStandings", [
        {
          ...driverStanding(),
          Constructors: [
            constructor,
            { ...constructor, constructorId: "fixture_second" },
          ],
        },
      ]),
    );
    const row = success(await provider.getDriverStandings({ season: 2024 }))
      .data[0];
    expect(row).toMatchObject({
      season: 2024,
      asOfRound: { status: "available", value: 3 },
      points: { status: "available", value: 12.5 },
      wins: { status: "available", value: 0 },
    });
    expect(row?.constructors.status).toBe("available");
    if (row?.constructors.status === "available")
      expect(row.constructors.value).toHaveLength(2);
    // permanentNumber is not authoritative for this historical season entry.
    expect(row?.driver.racingNumber.status).not.toBe("available");
  });

  it("normalizes constructor standings without manufacturing excluded positions", async () => {
    const excluded = omit(constructorStanding(), "position");
    const { provider } = harness(() =>
      standingsPage("ConstructorStandings", [
        { ...excluded, positionText: "E", points: "0" },
      ]),
    );
    const row = success(
      await provider.getConstructorStandings({ season: 2024 }),
    ).data[0];
    expect(row?.position.status).not.toBe("available");
    expect(row?.position.status).toBe("not-applicable");
    expect(row?.points).toEqual({ status: "available", value: 0 });
    expect(row?.asOfRound).toEqual({ status: "available", value: 3 });
  });

  it("uses event car number, numeric milliseconds and fastest-lap units", async () => {
    const { provider } = harness(() => resultsPage());
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row).toMatchObject({
      sessionId: "f1:2024:1:race",
      driver: { racingNumber: { status: "available", value: 7 } },
      time: {
        status: "available",
        value: { kind: "elapsed", milliseconds: 5000000 },
      },
      fastestLap: {
        status: "available",
        value: {
          time: { status: "available", value: { milliseconds: 80125 } },
          averageSpeed: {
            status: "available",
            value: { kilometersPerHour: 201.25 },
          },
        },
      },
    });
  });

  it("parses runner-up gap from source text rather than mistaking elapsed millis for gap", async () => {
    const { provider } = harness(() =>
      resultsPage([
        {
          ...raceResult(),
          position: "2",
          positionText: "2",
          Time: { millis: "5012345", time: "+12.345" },
        },
      ]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.time).toEqual({
      status: "available",
      value: { kind: "gap", milliseconds: 12345 },
    });
  });

  it("preserves authoritative elapsed milliseconds when upstream display truncates whole-second results", async () => {
    // Official serializer's str(timedelta)[:-3] can truncate a whole-second value.
    // This is synthetic data exercising that verified wire behavior.
    const { provider } = harness(() =>
      resultsPage([
        { ...raceResult(), Time: { millis: "10574000", time: "2:56" } },
      ]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.time).toEqual({
      status: "available",
      value: { kind: "elapsed", milliseconds: 10574000 },
    });
  });

  it.each(["Did not start", "Did_not_start"])(
    "keeps %s race timing not applicable consistently with the finish status",
    async (status) => {
      const { provider } = harness(() =>
        resultsPage([{ ...omit(raceResult(), "Time"), status }]),
      );
      const row = success(
        await provider.getRaceResults({ season: 2024, round: 1 }),
      ).data[0];
      expect(row?.finishStatus.kind).toBe("did-not-start");
      expect(row?.time).toEqual({ status: "not-applicable" });
    },
  );

  it("keeps a classified retirement distinct from its classification and preserves missing grid", async () => {
    const retirement = omit(raceResult(), "grid", "Time", "FastestLap");
    const { provider } = harness(() =>
      resultsPage([
        { ...retirement, position: "10", positionText: "10", status: "Engine" },
      ]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row).toMatchObject({
      classification: { position: { status: "available", value: 10 } },
      finishStatus: {
        kind: "retired",
        text: { status: "available", value: "Engine" },
      },
      grid: { status: "missing" },
    });
    expect(row?.time.status).not.toBe("available");
    expect(row?.fastestLap.status).not.toBe("available");
  });

  it.each([
    ["Disqualified", "disqualified"],
    ["Did not start", "did-not-start"],
    ["Not classified", "not-classified"],
  ])("preserves %s result status", async (status, kind) => {
    const { provider } = harness(() =>
      resultsPage([{ ...raceResult(), positionText: "D", status }]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.finishStatus.kind).toBe(kind);
    expect(row?.classification.text).toEqual({
      status: "available",
      value: "D",
    });
    expect(row?.classification.position.status).toBe("not-applicable");
  });

  it("does not invent a grid position or pit-lane certainty for source grid zero", async () => {
    const { provider } = harness(() =>
      resultsPage([{ ...raceResult(), grid: "0" }]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.grid.status).not.toBe("available");
  });

  it("converts explicit laps-down status and does not confuse it with retirement", async () => {
    const lapped = omit(raceResult(), "Time");
    const { provider } = harness(() =>
      resultsPage([{ ...lapped, status: "+2 Laps" }]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.time).toEqual({
      status: "available",
      value: { kind: "laps-down", laps: 2 },
    });
    expect(row?.finishStatus.kind).toBe("finished");
  });

  it("retains reported qualifying stages and leaves absent Q2/Q3 absent", async () => {
    const q1Only = omit(qualifyingResult(), "Q2", "Q3", "position");
    const { provider } = harness(() => qualifyingPage([q1Only]));
    const row = success(
      await provider.getQualifyingResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.sessionId).toBe("f1:2024:1:qualifying");
    expect(row?.classification.position.status).not.toBe("available");
    expect(row?.format).toBe("unknown");
    expect(row?.stages).toEqual([
      {
        id: "q1",
        name: "Q1",
        time: { status: "available", value: { milliseconds: 81125 } },
      },
    ]);
  });

  it("keeps missing optional scores/nationality absent rather than zero or empty text", async () => {
    const standing = omit(driverStanding(), "points", "wins");
    const historicDriver = omit(driver, "nationality", "permanentNumber");
    const { provider } = harness(() =>
      standingsPage("DriverStandings", [
        { ...standing, Driver: historicDriver },
      ]),
    );
    const row = success(await provider.getDriverStandings({ season: 2024 }))
      .data[0];
    expect(row?.points.status).not.toBe("available");
    expect(row?.wins.status).not.toBe("available");
    expect(row?.driver.driver.nationality.status).not.toBe("available");
    expect(row?.driver.racingNumber.status).not.toBe("available");
  });

  it("distinguishes a reported qualifying stage without a time from an absent stage", async () => {
    const qualifying = omit(qualifyingResult(), "Q3");
    const { provider } = harness(() =>
      qualifyingPage([{ ...qualifying, Q2: "" }]),
    );
    const row = success(
      await provider.getQualifyingResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.stages.map((stage) => stage.id)).toEqual(["q1", "q2"]);
    expect(row?.stages[1]?.time).toEqual({ status: "missing" });
  });

  it("does not backfill an absent event number from permanentNumber", async () => {
    const result = omit(raceResult(), "number");
    const { provider } = harness(() => resultsPage([result]));
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.driver.racingNumber.status).not.toBe("available");
  });

  it("retains historical entries for the same driver in different cars", async () => {
    const { provider } = harness(() =>
      resultsPage([
        raceResult(),
        { ...raceResult(), number: "8", position: "2", positionText: "2" },
      ]),
    );
    const rows = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.driver.driver.id).toBe(rows[1]?.driver.driver.id);
    expect(rows[0]?.driver.racingNumber).not.toEqual(
      rows[1]?.driver.racingNumber,
    );
  });

  it("preserves an incomplete classification and unfamiliar finish status without fabrication", async () => {
    const incomplete = omit(raceResult(), "position", "positionText");
    const { provider } = harness(() =>
      resultsPage([{ ...incomplete, status: "Unmapped source status" }]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.classification).toEqual({
      position: { status: "missing" },
      text: { status: "missing" },
    });
    expect(row?.finishStatus).toEqual({
      kind: "unknown",
      text: { status: "available", value: "Unmapped source status" },
    });
  });

  it("retains explicit null optional race metrics as missing", async () => {
    const { provider } = harness(() =>
      resultsPage([
        {
          ...raceResult(),
          points: null,
          laps: null,
          grid: null,
          Constructor: null,
          FastestLap: null,
        },
      ]),
    );
    const row = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).data[0];
    expect(row?.points).toEqual({ status: "missing" });
    expect(row?.lapsCompleted).toEqual({ status: "missing" });
    expect(row?.grid).toEqual({ status: "missing" });
    expect(row?.constructor).toEqual({ status: "missing" });
    expect(row?.fastestLap).toEqual({ status: "missing" });
  });
});

describe("complete pagination and runtime validation", () => {
  it("exhausts supported-season pages", async () => {
    const { provider, fetchMock } = harness(
      (url) => {
        const offset = Number(url.searchParams.get("offset"));
        const reply = seasonsPage([offset === 0 ? 2023 : 2024], 2, offset);
        reply.MRData.limit = "1";
        return reply;
      },
      { pageSize: 1 },
    );
    expect(
      success(await provider.getSupportedSeasons()).data.map((s) => s.year),
    ).toEqual([2023, 2024]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("exhausts a calendar and preserves validated round identity across pages", async () => {
    const { provider, fetchMock } = harness(
      (url) => {
        const offset = Number(url.searchParams.get("offset"));
        const reply = calendarPage(
          [{ ...race, round: String(offset + 1) }],
          2,
          offset,
        );
        reply.MRData.limit = "1";
        return reply;
      },
      { pageSize: 1 },
    );
    const result = success(await provider.getSeasonCalendar({ season: 2024 }));
    expect(result.data.map((event) => event.id)).toEqual([
      "f1:2024:1",
      "f1:2024:2",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["race", "qualifying", "driver", "constructor"] as const)(
    "exhausts nested %s rows rather than counting outer wrappers",
    async (kind) => {
      const { provider, fetchMock } = harness(
        (url) => {
          const offset = Number(url.searchParams.get("offset"));
          const reply =
            kind === "race"
              ? resultsPage([raceResult(`fixture_${offset}`)], 2, offset)
              : kind === "qualifying"
                ? qualifyingPage(
                    [qualifyingResult(`fixture_${offset}`)],
                    2,
                    offset,
                  )
                : kind === "driver"
                  ? standingsPage(
                      "DriverStandings",
                      [driverStanding(`fixture_${offset}`)],
                      2,
                      offset,
                    )
                  : standingsPage(
                      "ConstructorStandings",
                      [constructorStanding(`fixture_${offset}`)],
                      2,
                      offset,
                    );
          reply.MRData.limit = "1";
          return reply;
        },
        { pageSize: 1 },
      );
      const result =
        kind === "race"
          ? await provider.getRaceResults({ season: 2024, round: 1 })
          : kind === "qualifying"
            ? await provider.getQualifyingResults({ season: 2024, round: 1 })
            : kind === "driver"
              ? await provider.getDriverStandings({ season: 2024 })
              : await provider.getConstructorStandings({ season: 2024 });
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data).toHaveLength(2);
        expect(result.metadata.completeness).toBe("complete");
      }
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("does not return a silently truncated collection when page bound is reached", async () => {
    const { provider } = harness(
      () => {
        const reply = seasonsPage([2024], 2);
        reply.MRData.limit = "1";
        return reply;
      },
      { pageSize: 1, maxPages: 1 },
    );
    const result = await provider.getSupportedSeasons();
    expect(
      result.status === "error" ||
        (result.status === "success" &&
          result.metadata.completeness === "partial"),
    ).toBe(true);
  });

  it("rejects changed totals and repeated offsets across source pages", async () => {
    const { provider } = harness(
      (url) => {
        const offset = Number(url.searchParams.get("offset"));
        const reply = seasonsPage([2024], offset ? 3 : 2, 0);
        reply.MRData.limit = "1";
        return reply;
      },
      { pageSize: 1 },
    );
    expect(errorCode(await provider.getSupportedSeasons())).toBe(
      "invalid-response",
    );
  });

  it("rejects duplicate source identities instead of claiming a complete collection", async () => {
    const { provider } = harness(() => seasonsPage([2024, 2024]));
    expect(errorCode(await provider.getSupportedSeasons())).toBe(
      "invalid-response",
    );
  });

  it.each(["race", "qualifying", "driver", "constructor"] as const)(
    "rejects duplicate %s identities even when other row fields differ",
    async (kind) => {
      const { provider } = harness(() =>
        kind === "race"
          ? resultsPage([raceResult(), { ...raceResult(), points: "18" }])
          : kind === "qualifying"
            ? qualifyingPage([
                qualifyingResult(),
                { ...qualifyingResult(), Q1: "1:20.000" },
              ])
            : kind === "driver"
              ? standingsPage("DriverStandings", [
                  driverStanding(),
                  { ...driverStanding(), points: "11" },
                ])
              : standingsPage("ConstructorStandings", [
                  constructorStanding(),
                  { ...constructorStanding(), points: "11" },
                ]),
      );
      const result =
        kind === "race"
          ? await provider.getRaceResults({ season: 2024, round: 1 })
          : kind === "qualifying"
            ? await provider.getQualifyingResults({ season: 2024, round: 1 })
            : kind === "driver"
              ? await provider.getDriverStandings({ season: 2024 })
              : await provider.getConstructorStandings({ season: 2024 });
      expect(result.status).toBe("error");
      if (result.status === "error")
        expect(result.error.code).toBe("invalid-response");
    },
  );

  it.each([
    null,
    { MRData: { series: "f1", limit: "100", offset: "0", total: "1" } },
    envelope({ SeasonTable: { Seasons: [{ season: "NaN" }] } }, 1),
    envelope({ SeasonTable: { Seasons: [{ season: "2024" }] } }, -1),
  ])("sanitizes invalid upstream payload %#", async (payload) => {
    const { provider } = harness(() => payload);
    expect(errorCode(await provider.getSupportedSeasons())).toBe(
      "invalid-response",
    );
  });

  it("rejects impossible source calendar dates", async () => {
    const { provider } = harness(() =>
      calendarPage([{ ...race, date: "2024-02-30" }]),
    );
    expect(errorCode(await provider.getSeasonCalendar({ season: 2024 }))).toBe(
      "invalid-response",
    );
  });

  it("rejects wrong event context and invalid optional numeric fields", async () => {
    const wrongContext = harness(() =>
      calendarPage([{ ...race, season: "2023" }]),
    );
    expect(
      errorCode(
        await wrongContext.provider.getEventDetails({ season: 2024, round: 1 }),
      ),
    ).toBe("invalid-response");
    const badPoints = harness(() =>
      resultsPage([{ ...raceResult(), points: "NaN" }]),
    );
    expect(
      errorCode(
        await badPoints.provider.getRaceResults({ season: 2024, round: 1 }),
      ),
    ).toBe("invalid-response");
  });

  it("rejects malformed qualifying durations rather than coercing to zero", async () => {
    const { provider } = harness(() =>
      qualifyingPage([{ ...qualifyingResult(), Q1: "1:99.000" }]),
    );
    expect(
      errorCode(
        await provider.getQualifyingResults({ season: 2024, round: 1 }),
      ),
    ).toBe("invalid-response");
  });

  it("returns typed invalid-request for unsupported selectors without fetching", async () => {
    const { provider, fetchMock } = harness(() => seasonsPage());
    expect(
      errorCode(await provider.getSeasonCalendar({ season: 2024.5 })),
    ).toBe("invalid-request");
    expect(
      errorCode(await provider.getRaceResults({ season: 2024, round: 0 })),
    ).toBe("invalid-request");
    expect(
      errorCode(
        await provider.getSeasonCalendar({ season: 2024, extra: true } as {
          season: number;
        }),
      ),
    ).toBe("invalid-request");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("availability and HTTP failures", () => {
  it("does not derive fresh unknown-season from stale supported-season evidence after failed refresh", async () => {
    let failSupport = false;
    const { provider, advance } = harness((url) => {
      if (url.pathname.includes("seasons")) {
        if (failSupport) throw new Error("SECRET support refresh failed");
        return seasonsPage([2024]);
      }
      return envelope({ RaceTable: { season: "2025", Races: [] } }, 0);
    });
    success(await provider.getSupportedSeasons());
    failSupport = true;
    advance(24 * 60 * 60_000 + 1);
    const result = await provider.getSeasonCalendar({ season: 2025 });
    expect(errorCode(result)).toBe("network");
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });

  it("does not derive fresh unknown-event from stale calendar evidence after failed refresh", async () => {
    let failCalendar = false;
    const { provider, advance } = harness((url) => {
      if (url.pathname.endsWith("/2024/2/races/")) return calendarPage([]);
      if (failCalendar) throw new Error("calendar refresh failed");
      return calendarPage();
    });
    success(await provider.getSeasonCalendar({ season: 2024 }));
    failCalendar = true;
    advance(60 * 60_000 + 1);
    const result = await provider.getEventDetails({ season: 2024, round: 2 });
    expect(errorCode(result)).toBe("network");
  });

  it("does not derive fresh unpublished results from stale event evidence after failed refresh", async () => {
    let failEvent = false;
    const { provider, advance } = harness((url) => {
      if (url.pathname.includes("results")) return resultsPage([]);
      if (failEvent) throw new Error("event refresh failed");
      return calendarPage();
    });
    success(await provider.getEventDetails({ season: 2024, round: 1 }));
    failEvent = true;
    advance(60 * 60_000 + 1);
    const result = await provider.getRaceResults({ season: 2024, round: 1 });
    expect(errorCode(result)).toBe("network");
  });

  it("distinguishes an unknown season from an unpublished calendar", async () => {
    const { provider } = harness((url) =>
      url.pathname.includes("seasons") ? seasonsPage([]) : calendarPage([]),
    );
    expect(await provider.getSeasonCalendar({ season: 2024 })).toMatchObject({
      status: "unavailable",
      reason: "unknown-season",
    });
  });

  it("does not label absent results for a known event as empty success", async () => {
    const { provider } = harness((url) =>
      url.pathname.includes("results")
        ? resultsPage([])
        : standardFallback(url),
    );
    expect(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).toMatchObject({ status: "unavailable" });
  });

  it("rejects invalid JSON safely and does not cache an operational failure", async () => {
    let calls = 0;
    const { provider, fetchMock } = harness(() =>
      ++calls === 1
        ? new Response("private-upstream-secret", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        : seasonsPage(),
    );
    const first = await provider.getSupportedSeasons();
    expect(errorCode(first)).toBe("invalid-response");
    expect(JSON.stringify(first)).not.toContain("private-upstream-secret");
    success(await provider.getSupportedSeasons());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("bounds retries for retryable network errors and sanitizes exception strings", async () => {
    const { provider, fetchMock, sleep } = harness(
      () => {
        throw new Error("token=SECRET upstream details");
      },
      { maxRetries: 2 },
    );
    const result = await provider.getSupportedSeasons();
    expect(errorCode(result)).toBe("network");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });

  it("retries provider 503 with bounded delays and can recover", async () => {
    let calls = 0;
    const { provider, fetchMock } = harness(
      () =>
        ++calls < 3 ? new Response("bad", { status: 503 }) : seasonsPage(),
      { maxRetries: 2 },
    );
    success(await provider.getSupportedSeasons());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("handles timeout with an abortable budget", async () => {
    vi.useFakeTimers();
    const { provider } = harness(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
      { timeoutMs: 10 },
    );
    const pending = provider.getSupportedSeasons();
    await vi.advanceTimersByTimeAsync(100);
    expect(errorCode(await pending)).toBe("timeout");
  });

  it("enforces timeout while a successful response body is stalled", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const { provider } = harness(
      (_url, init) => {
        signal = init?.signal;
        return new Response(new ReadableStream<Uint8Array>(), {
          headers: { "Content-Type": "application/json" },
        });
      },
      { timeoutMs: 10 },
    );
    const pending = provider.getSupportedSeasons();
    await vi.advanceTimersByTimeAsync(100);
    expect(errorCode(await pending)).toBe("timeout");
    expect(signal?.aborted).toBe(true);
  });

  it("rejects oversized response bodies without exposing their contents", async () => {
    const { provider } = harness(
      () =>
        new Response("SECRET", {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(2 * 1024 * 1024 + 1),
          },
        }),
    );
    const result = await provider.getSupportedSeasons();
    expect(errorCode(result)).toBe("invalid-response");
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });

  it.each(["60", "Fri, 06 Nov 2026 12:01:00 GMT"])(
    "honors 429 Retry-After %s across operations sharing a transport",
    async (retryAfter) => {
      const { provider, fetchMock } = harness(
        () =>
          new Response("SECRET", {
            status: 429,
            headers: { "Retry-After": retryAfter },
          }),
      );
      const first = await provider.getSupportedSeasons();
      expect(errorCode(first)).toBe("rate-limited");
      if (first.status !== "error") throw new Error("Expected rate limit");
      expect(first.error.retryAt).toBe("2026-11-06T12:01:00.000Z");
      expect(
        errorCode(await provider.getSeasonCalendar({ season: 2024 })),
      ).toBe("rate-limited");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("bounds malformed Retry-After and avoids immediate rate-limit retries", async () => {
    const { provider, fetchMock } = harness(
      () =>
        new Response("", {
          status: 429,
          headers: { "Retry-After": "999999999999999999999999999999999" },
        }),
      { maxRetries: 2 },
    );
    const result = await provider.getSupportedSeasons();
    expect(errorCode(result)).toBe("rate-limited");
    if (result.status !== "error") throw new Error("Expected rate limit");
    expect(Date.parse(result.error.retryAt ?? "") - NOW).toBeLessThanOrEqual(
      24 * 60 * 60_000,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shares 429 cooldown across provider instances using the same fetch transport", async () => {
    const { provider, fetchMock } = harness(
      () => new Response("", { status: 429, headers: { "Retry-After": "60" } }),
    );
    const other = createJolpicaProvider({
      fetch: fetchMock,
      now: () => NOW,
      maxRetries: 0,
    });
    expect(errorCode(await provider.getSupportedSeasons())).toBe(
      "rate-limited",
    );
    expect(errorCode(await other.getSeasonCalendar({ season: 2024 }))).toBe(
      "rate-limited",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [429, "application/json", undefined, "rate-limited"],
    [503, "application/json", undefined, "temporarily-unavailable"],
    [200, "text/html", undefined, "invalid-response"],
    [200, "application/json", String(2 * 1024 * 1024 + 1), "invalid-response"],
  ] as const)(
    "sanitizes %s responses even when body cancellation rejects (%s)",
    async (status, contentType, length, code) => {
      const { provider, fetchMock } = harness(
        () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.error(new Error("SECRET stream failure"));
              },
            }),
            {
              status,
              headers: {
                "Content-Type": contentType,
                ...(status === 429 ? { "Retry-After": "60" } : {}),
                ...(length === undefined ? {} : { "Content-Length": length }),
              },
            },
          ),
      );
      const result = await provider.getSupportedSeasons();
      expect(errorCode(result)).toBe(code);
      expect(JSON.stringify(result)).not.toContain("SECRET");
      if (status === 429) {
        expect(
          errorCode(await provider.getSeasonCalendar({ season: 2024 })),
        ).toBe("rate-limited");
        expect(fetchMock).toHaveBeenCalledTimes(1);
      }
    },
  );
});

describe("cache, deduplication and shared provider budget", () => {
  it.each(["inherited", "non-enumerable"] as const)(
    "rejects or canonically captures %s request selectors without cache collisions",
    async (kind) => {
      const { provider } = harness((url) => {
        const match = /\/(\d{4})\/races\//.exec(url.pathname);
        const season = match?.[1] ?? "2024";
        return envelope(
          { RaceTable: { season, Races: [{ ...race, season }] } },
          1,
        );
      });
      for (const season of [2024, 2023]) {
        // Deliberately exercise valid-looking runtime objects outside plain JSON.
        const request =
          kind === "inherited"
            ? (Object.create({ season }) as { season: number })
            : Object.defineProperty({ season }, "season", {
                enumerable: false,
              });
        const result = await provider.getSeasonCalendar(request);
        if (result.status === "error")
          expect(result.error.code).toBe("invalid-request");
        else {
          expect(result.status).toBe("success");
          if (result.status === "success")
            expect(result.data[0]?.season).toBe(season);
        }
      }
    },
  );
  it("captures canonical request values before a caller mutates the original object", async () => {
    const { provider } = harness(() => calendarPage());
    const request = { season: 2024, round: 1 };
    const pending = provider.getEventDetails(request);
    request.round = 2;
    expect(success(await pending).data.id).toBe("f1:2024:1");
  });
  it("deduplicates concurrent logical requests and returns immutable cached data", async () => {
    let resolveReply: ((value: unknown) => void) | undefined;
    const { provider, fetchMock } = harness(
      () =>
        new Promise((resolve) => {
          resolveReply = resolve;
        }),
    );
    const first = provider.getSupportedSeasons();
    const second = provider.getSupportedSeasons();
    await Promise.resolve();
    await Promise.resolve();
    if (!resolveReply) throw new Error("Expected upstream request");
    resolveReply(seasonsPage());
    const [a, b] = await Promise.all([first, second]);
    success(a);
    success(b);
    const cached = success(await provider.getSupportedSeasons());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cached.metadata.cache).toBe("hit");
    expect(Object.isFrozen(cached.data)).toBe(true);
    expect(Object.isFrozen(cached.data[0])).toBe(true);
  });

  it("cache hits retain original retrieval and expiry, then revalidate after TTL", async () => {
    const { provider, fetchMock, advance } = harness(() => seasonsPage());
    const first = success(await provider.getSupportedSeasons());
    advance(60_000);
    const cached = success(await provider.getSupportedSeasons());
    expect(cached.metadata.retrievedAt).toBe(first.metadata.retrievedAt);
    expect(cached.metadata.expiresAt).toBe(first.metadata.expiresAt);
    advance(24 * 60 * 60_000);
    const refreshed = success(await provider.getSupportedSeasons());
    expect(refreshed.metadata.cache).toBe("miss");
    expect(refreshed.metadata.retrievedAt).not.toBe(first.metadata.retrievedAt);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves stale success only inside the ceiling, keeping original timestamps and explicit refresh error", async () => {
    let fail = false;
    const { provider, advance } = harness(() => {
      if (fail) throw new Error("network down");
      return seasonsPage();
    });
    const original = success(await provider.getSupportedSeasons());
    fail = true;
    advance(24 * 60 * 60_000 + 1);
    const stale = success(await provider.getSupportedSeasons());
    expect(stale.metadata).toMatchObject({
      freshness: "stale",
      retrievedAt: original.metadata.retrievedAt,
      expiresAt: original.metadata.expiresAt,
      revalidationError: { code: "network" },
    });
    advance(7 * 24 * 60 * 60_000);
    expect(errorCode(await provider.getSupportedSeasons())).toBe("network");
  });

  it("does not reuse stale success when revalidation confirms source unavailability", async () => {
    let absent = false;
    const { provider, advance } = harness((url) => {
      if (url.pathname.includes("results"))
        return absent ? resultsPage([]) : resultsPage();
      return standardFallback(url);
    });
    success(await provider.getRaceResults({ season: 2024, round: 1 }));
    absent = true;
    advance(5 * 60_000 + 1);
    expect(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    ).toMatchObject({ status: "unavailable" });
  });

  it("conservative result caching uses five minutes when upstream finality is unknown", async () => {
    const { provider } = harness(() => resultsPage());
    const result = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    );
    expect(result.metadata.finality).toBe("unknown");
    expect(
      Date.parse(result.metadata.expiresAt ?? "") -
        Date.parse(result.metadata.retrievedAt),
    ).toBe(5 * 60_000);
  });

  it("expires unavailable results within thirty seconds and never serves stale unavailability", async () => {
    const { provider, fetchMock, advance } = harness((url) =>
      url.pathname.includes("results")
        ? resultsPage([])
        : standardFallback(url),
    );
    expect(
      (await provider.getRaceResults({ season: 2024, round: 1 })).status,
    ).toBe("unavailable");
    const calls = fetchMock.mock.calls.length;
    advance(29_999);
    expect(
      (await provider.getRaceResults({ season: 2024, round: 1 })).status,
    ).toBe("unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    advance(2);
    expect(
      (await provider.getRaceResults({ season: 2024, round: 1 })).status,
    ).toBe("unavailable");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls);
  });

  it("enforces the sustained five-hundred requests per hour limit", async () => {
    const { provider, fetchMock } = harness((url) => {
      const match = /\/2024\/(\d+)\/races\//.exec(url.pathname);
      if (!match?.[1]) throw new Error("Expected an event request");
      return calendarPage([{ ...race, round: match[1] }]);
    });
    for (let round = 1; round <= 500; round++) {
      success(await provider.getEventDetails({ season: 2024, round }));
    }
    expect(
      errorCode(await provider.getEventDetails({ season: 2024, round: 501 })),
    ).toBe("rate-limited");
    expect(fetchMock).toHaveBeenCalledTimes(500);
  });

  it("limits all operations sharing one transport to the provider request budget", async () => {
    const { provider, sleep, fetchMock } = harness((url) => {
      if (url.pathname.includes("seasons")) return seasonsPage();
      if (url.pathname.includes("driverstandings"))
        return standingsPage("DriverStandings", [driverStanding()]);
      if (url.pathname.includes("constructorstandings"))
        return standingsPage("ConstructorStandings", [constructorStanding()]);
      if (url.pathname.includes("qualifying")) return qualifyingPage();
      if (url.pathname.includes("results")) return resultsPage();
      return calendarPage();
    });
    await provider.getSupportedSeasons();
    await provider.getSeasonCalendar({ season: 2024 });
    await provider.getDriverStandings({ season: 2024 });
    await provider.getConstructorStandings({ season: 2024 });
    await provider.getRaceResults({ season: 2024, round: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(
      sleep.mock.calls.some(([milliseconds]) => milliseconds >= 1000),
    ).toBe(true);
  });
});

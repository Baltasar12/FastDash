/**
 * Entirely synthetic records, authored for SECTOR tests. No copied race results.
 * Wire shape verified against official Jolpica docs on 2026-11-06:
 * https://github.com/jolpica/jolpica-f1/tree/main/docs/endpoints
 * Pagination totals count nested result/standing rows, not Race/StandingsLists.
 */
export const driver = {
  driverId: "fixture_driver",
  permanentNumber: "88",
  code: "FIX",
  givenName: "Fixture",
  familyName: "Driver",
  nationality: "Example",
};

export const constructor = {
  constructorId: "fixture_constructor",
  name: "Fixture Constructor",
  nationality: "Example",
};

export const race = {
  season: "2024",
  round: "1",
  raceName: "Synthetic Grand Prix",
  Circuit: {
    circuitId: "fixture_circuit",
    circuitName: "Synthetic Circuit",
    Location: { locality: "Example City", country: "Example Country" },
  },
  date: "2024-03-02",
  time: "15:00:00Z",
};

export function raceResult(id = "fixture_driver") {
  return {
    number: "7",
    position: "1",
    positionText: "1",
    points: "25",
    Driver: { ...driver, driverId: id },
    Constructor: { ...constructor },
    grid: "1",
    laps: "50",
    status: "Finished",
    Time: { millis: "5000000", time: "1:23:20.000" },
    FastestLap: {
      rank: "1",
      lap: "22",
      Time: { time: "1:20.125" },
      AverageSpeed: { units: "kph", speed: "201.25" },
    },
  };
}

export function qualifyingResult(id = "fixture_driver") {
  return {
    number: "7",
    position: "1",
    Driver: { ...driver, driverId: id },
    Constructor: { ...constructor },
    Q1: "1:21.125",
    Q2: "1:20.500",
    Q3: "1:20.000",
  };
}

export function driverStanding(id = "fixture_driver") {
  return {
    position: "1",
    positionText: "1",
    points: "12.5",
    wins: "0",
    Driver: { ...driver, driverId: id },
    Constructors: [{ ...constructor }],
  };
}

export function constructorStanding(id = "fixture_constructor") {
  return {
    position: "1",
    positionText: "1",
    points: "12.5",
    wins: "0",
    Constructor: { ...constructor, constructorId: id },
  };
}

export function envelope(
  table: Record<string, unknown>,
  total: number,
  offset = 0,
  limit = 100,
) {
  return {
    MRData: {
      xmlns: "",
      series: "f1",
      url: "https://api.jolpi.ca/ergast/f1/",
      limit: String(limit),
      offset: String(offset),
      total: String(total),
      ...table,
    },
  };
}

export function seasonsPage(years = [2024], total = years.length, offset = 0) {
  return envelope(
    {
      SeasonTable: {
        Seasons: years.map((season) => ({ season: String(season) })),
      },
    },
    total,
    offset,
  );
}

export function calendarPage(
  races: readonly Record<string, unknown>[] = [race],
  total = races.length,
  offset = 0,
) {
  return envelope(
    { RaceTable: { season: "2024", Races: races } },
    total,
    offset,
  );
}

export function resultsPage(
  rows: readonly Record<string, unknown>[] = [raceResult()],
  total = rows.length,
  offset = 0,
) {
  return envelope(
    {
      RaceTable: {
        season: "2024",
        round: "1",
        Races: rows.length ? [{ ...race, Results: rows }] : [],
      },
    },
    total,
    offset,
  );
}

export function qualifyingPage(
  rows: readonly Record<string, unknown>[] = [qualifyingResult()],
  total = rows.length,
  offset = 0,
) {
  return envelope(
    {
      RaceTable: {
        season: "2024",
        round: "1",
        Races: rows.length ? [{ ...race, QualifyingResults: rows }] : [],
      },
    },
    total,
    offset,
  );
}

export function standingsPage(
  kind: "DriverStandings" | "ConstructorStandings",
  rows: readonly Record<string, unknown>[],
  total = rows.length,
  offset = 0,
  round = "3",
) {
  return envelope(
    {
      StandingsTable: {
        season: "2024",
        round,
        StandingsLists: rows.length
          ? [{ season: "2024", round, [kind]: rows }]
          : [],
      },
    },
    total,
    offset,
  );
}

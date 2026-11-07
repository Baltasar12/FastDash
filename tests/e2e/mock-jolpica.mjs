/**
 * Test-only Node preload. Playwright imports this into its production-server child;
 * normal `pnpm start` never loads it. Original synthetic wire records, no real data.
 * Intercept only Jolpica HTTPS. Never fall through to the public racing API.
 */
if (process.env.SECTOR_E2E !== "1") {
  throw new Error("The Jolpica test preload requires the isolated E2E server");
}

// Anchor wall time between the unpublished and upcoming fixture events, even
// when the host runs in a future year. Keep real timers and elapsed time so
// streaming, timeouts, provider TTLs and cooldowns retain their normal behavior.
const SystemDate = globalThis.Date;
const epoch = SystemDate.parse("2026-11-07T12:00:00.000Z");
const started = performance.now();
const now = () => epoch + Math.floor(performance.now() - started);
globalThis.Date = new Proxy(SystemDate, {
  apply: () => new SystemDate(now()).toString(),
  construct: (target, args, newTarget) =>
    Reflect.construct(target, args.length ? args : [now()], newTarget),
  get: (target, property, receiver) =>
    property === "now" ? now : Reflect.get(target, property, receiver),
});

const originalFetch = globalThis.fetch;
const driver = {
  driverId: "wire_example",
  givenName: "Wire",
  familyName: "Example",
  code: "WEX",
  nationality: "Example",
};
const constructor = {
  constructorId: "example_team",
  name: "Example Constructor",
  nationality: "Example",
};
const circuit = {
  circuitId: "example_circuit",
  circuitName: "Example Circuit",
  Location: { locality: "Example City", country: "Example Country" },
};
const events = [
  { round: "1", raceName: "Published Example Grand Prix", date: "2026-01-01" },
  {
    round: "2",
    raceName: "Unpublished Example Grand Prix",
    date: "2026-11-01",
  },
  {
    round: "3",
    raceName: "Next Example Grand Prix",
    date: "2026-12-31",
    Qualifying: { date: "2026-12-30", time: "12:00:00Z" },
    Sprint: { date: "2026-12-30", time: "16:00:00Z" },
  },
].map((event) => ({ season: "2026", Circuit: circuit, ...event }));

function envelope(table, total) {
  return {
    MRData: {
      xmlns: "",
      series: "f1",
      url: "https://api.jolpi.ca/ergast/f1/",
      limit: "100",
      offset: "0",
      total: String(total),
      ...table,
    },
  };
}

globalThis.fetch = async function testOnlyJolpicaFetch(input, init) {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.protocol !== "https:" || url.hostname !== "api.jolpi.ca")
    return originalFetch(input, init);
  const path = url.pathname;
  if (path.endsWith("/seasons/"))
    return Response.json(
      envelope(
        {
          SeasonTable: {
            Seasons: [
              { season: "2026" },
              { season: "2025" },
              { season: "2024" },
              { season: "2023" },
            ],
          },
        },
        4,
      ),
    );
  const season = path.match(/\/f1\/(\d{4})\//)?.[1];
  if (season === "2025") throw new Error("Deterministic test network failure");
  if (season === "2024" || season === "2023") {
    if (path.endsWith("/races/")) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return Response.json(envelope({ RaceTable: { season, Races: [] } }, 0));
    }
    if (
      path.endsWith("/driverstandings/") ||
      path.endsWith("/constructorstandings/")
    )
      return Response.json(
        envelope({ StandingsTable: { season, StandingsLists: [] } }, 0),
      );
    throw new Error("Unhandled slow-loading test request");
  }
  if (season !== "2026")
    return Response.json(envelope({ RaceTable: { season, Races: [] } }, 0));
  const round = path.match(/\/2026\/(\d+)\//)?.[1];
  const event = events.find((item) => item.round === round);
  if (path.endsWith("/races/")) {
    const races = round ? (event ? [event] : []) : events;
    return Response.json(
      envelope(
        { RaceTable: { season, ...(round ? { round } : {}), Races: races } },
        races.length,
      ),
    );
  }
  const resultBase = {
    number: "7",
    position: "1",
    Driver: driver,
    Constructor: constructor,
  };
  if (path.endsWith("/results/") || path.endsWith("/qualifying/")) {
    const kind = path.endsWith("/results/") ? "Results" : "QualifyingResults";
    const rows =
      event && round !== "2"
        ? [
            kind === "Results"
              ? {
                  ...resultBase,
                  positionText: "1",
                  points: "25",
                  grid: "1",
                  laps: "50",
                  status: "Finished",
                  Time: { millis: "5000000", time: "1:23:20.000" },
                }
              : {
                  ...resultBase,
                  Q1: "1:21.125",
                  Q2: "1:20.500",
                  Q3: "1:20.000",
                },
          ]
        : [];
    return Response.json(
      envelope(
        {
          RaceTable: {
            season,
            round,
            Races: rows.length ? [{ ...event, [kind]: rows }] : [],
          },
        },
        rows.length,
      ),
    );
  }
  if (
    path.endsWith("/driverstandings/") ||
    path.endsWith("/constructorstandings/")
  ) {
    const kind = path.endsWith("/driverstandings/")
      ? "DriverStandings"
      : "ConstructorStandings";
    const row = {
      position: "1",
      positionText: "1",
      points: "25",
      wins: "1",
      ...(kind === "DriverStandings"
        ? { Driver: driver, Constructors: [constructor] }
        : { Constructor: constructor }),
    };
    return Response.json(
      envelope(
        {
          StandingsTable: {
            season,
            round: "1",
            StandingsLists: [{ season, round: "1", [kind]: [row] }],
          },
        },
        1,
      ),
    );
  }
  throw new Error(`Unhandled Jolpica test path: ${path}`);
};

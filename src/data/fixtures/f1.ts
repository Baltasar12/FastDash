/** Entirely invented data for tests/previews. Never actual Formula 1 results. */
import type {
  Constructor,
  ConstructorStanding,
  Driver,
  DriverSeason,
  DriverStanding,
  FieldValue,
  GrandPrix,
  QualifyingResult,
  RaceResult,
  Season,
  Session,
  SessionKind,
} from "@/types/f1";
import { createEventId, createSessionId } from "@/types/f1-identifiers";

export const FIXTURE_LABEL =
  "SYNTHETIC SAMPLE — invented season, people and results";
export const FIXTURE_SEASON = 2099;

export function available<T>(value: T): FieldValue<T> {
  return { status: "available", value };
}

// Named objects avoid assertions and non-null indexing in consumers/tests.
export const sampleConstructor: Constructor = {
  id: "constructor:sample-alder",
  name: "Sample Alder Racing",
  nationality: available("Sampleland"),
  visual: { accentToken: "accent" },
};
export const sampleOtherConstructor: Constructor = {
  id: "constructor:sample-boreal",
  name: "Sample Boreal Motorsport",
  nationality: { status: "missing" },
};

export const sampleConstructors: readonly Constructor[] = [
  sampleConstructor,
  sampleOtherConstructor,
];

export const sampleDriver: Driver = {
  id: "driver:sample-aria",
  givenName: "Aria",
  familyName: "Sample",
  nationality: available("Sampleland"),
};

export const sampleDriverEntry: DriverSeason = {
  season: FIXTURE_SEASON,
  driver: sampleDriver,
  code: available("SMP"),
  racingNumber: available(12),
};

/** Same identity with a different season number; never overwrite global identity. */
export const samplePreviousDriverEntry: DriverSeason = {
  ...sampleDriverEntry,
  season: FIXTURE_SEASON - 1,
  racingNumber: available(27),
};

function session(round: number, kind: SessionKind, day: string): Session {
  const eventId = createEventId(FIXTURE_SEASON, round);
  return {
    id: createSessionId(eventId, kind),
    eventId,
    kind,
    name: available(`Sample ${kind}`),
    start: available({ precision: "date", date: day }),
    status: "completed",
  };
}

export const sampleRegularEvent: GrandPrix = {
  id: createEventId(FIXTURE_SEASON, 1),
  season: FIXTURE_SEASON,
  round: 1,
  name: "Sample Meadow Grand Prix",
  circuit: {
    id: "circuit:sample-meadow",
    name: "Sample Meadow Circuit",
    country: available("Sampleland"),
    locality: available("Meadow"),
  },
  date: available("2099-04-12"),
  sessions: available([
    session(1, "practice-1", "2099-04-10"),
    session(1, "practice-2", "2099-04-10"),
    session(1, "practice-3", "2099-04-11"),
    session(1, "qualifying", "2099-04-11"),
    {
      ...session(1, "race", "2099-04-12"),
      start: available({ precision: "instant", at: "2099-04-12T14:00:00Z" }),
    },
  ]),
};

export const sampleSprintEvent: GrandPrix = {
  ...sampleRegularEvent,
  id: createEventId(FIXTURE_SEASON, 2),
  round: 2,
  name: "Sample Ridge Grand Prix",
  circuit: {
    id: "circuit:sample-ridge",
    name: "Sample Ridge Circuit",
    country: available("Sampleland"),
    locality: { status: "missing" },
  },
  date: available("2099-04-26"),
  sessions: available([
    session(2, "practice-1", "2099-04-24"),
    session(2, "sprint-qualifying", "2099-04-24"),
    session(2, "sprint", "2099-04-25"),
    session(2, "qualifying", "2099-04-25"),
    session(2, "race", "2099-04-26"),
  ]),
};

/** Normalized incomplete input, not a claim about an upstream JSON schema. */
export const sampleIncompleteEvent: GrandPrix = {
  ...sampleSprintEvent,
  date: { status: "missing" },
  sessions: { status: "unavailable", reason: "not-covered" },
};

export const sampleSeason: Season = {
  year: FIXTURE_SEASON,
  events: available([sampleRegularEvent, sampleSprintEvent]),
  championship: available({
    name: available("Synthetic sample championship"),
    status: "completed",
  }),
};

export const sampleDriverStandings: readonly DriverStanding[] = [
  {
    season: FIXTURE_SEASON,
    asOfRound: available(2),
    position: available(1),
    driver: sampleDriverEntry,
    constructors: available([sampleConstructor, sampleOtherConstructor]),
    points: available(45),
    wins: available(1),
  },
];

export const sampleConstructorStandings: readonly ConstructorStanding[] = [
  {
    season: FIXTURE_SEASON,
    asOfRound: available(2),
    position: available(1),
    constructor: sampleConstructor,
    points: available(45),
    wins: available(1),
  },
  {
    season: FIXTURE_SEASON,
    asOfRound: available(2),
    position: available(2),
    constructor: sampleOtherConstructor,
    points: available(0),
    wins: available(0),
  },
];

export const sampleRaceWinner: RaceResult = {
  sessionId: createSessionId(sampleRegularEvent.id, "race"),
  driver: sampleDriverEntry,
  constructor: available(sampleConstructor),
  grid: available({ kind: "position", position: 1 }),
  classification: { position: available(1), text: available("1") },
  points: available(25),
  lapsCompleted: available(50),
  finishStatus: { kind: "finished", text: available("Finished") },
  time: available({ kind: "elapsed", milliseconds: 5_400_000 }),
  fastestLap: available({
    lapNumber: available(32),
    rank: available(1),
    time: available({ milliseconds: 87_432 }),
    averageSpeed: { status: "unavailable", reason: "not-covered" },
  }),
};

function raceEntry(
  key: string,
  overrides: Partial<Omit<RaceResult, "constructor">>,
): RaceResult {
  return {
    ...sampleRaceWinner,
    driver: {
      ...sampleDriverEntry,
      driver: { ...sampleDriver, id: `driver:sample-${key}`, givenName: key },
      code: { status: "missing" },
      racingNumber: { status: "missing" },
    },
    ...overrides,
  };
}

export const sampleRaceResults: readonly RaceResult[] = [
  sampleRaceWinner,
  raceEntry("gap", {
    grid: available({ kind: "position", position: 2 }),
    classification: { position: available(2), text: available("2") },
    points: available(18),
    time: available({ kind: "gap", milliseconds: 2_150 }),
    fastestLap: { status: "missing" },
  }),
  raceEntry("lapped", {
    grid: available({ kind: "position", position: 3 }),
    classification: { position: available(3), text: available("3") },
    points: available(15),
    lapsCompleted: available(49),
    time: available({ kind: "laps-down", laps: 1 }),
    fastestLap: { status: "unavailable", reason: "not-covered" },
  }),
  raceEntry("retired", {
    grid: available({ kind: "position", position: 4 }),
    classification: {
      position: { status: "not-applicable" },
      text: available("R"),
    },
    points: available(0),
    lapsCompleted: available(12),
    finishStatus: {
      kind: "retired",
      text: available("Sample mechanical failure"),
    },
    time: { status: "not-applicable" },
    fastestLap: available({
      lapNumber: { status: "missing" },
      rank: { status: "missing" },
      time: { status: "unavailable", reason: "not-covered" },
      averageSpeed: { status: "unavailable", reason: "not-covered" },
    }),
  }),
  raceEntry("dns", {
    grid: { status: "not-applicable" },
    classification: {
      position: { status: "not-applicable" },
      text: available("DNS"),
    },
    points: available(0),
    lapsCompleted: available(0),
    finishStatus: { kind: "did-not-start", text: available("Did not start") },
    time: { status: "not-applicable" },
    fastestLap: { status: "not-applicable" },
  }),
  raceEntry("dsq", {
    grid: available({ kind: "pit-lane" }),
    classification: {
      position: { status: "not-applicable" },
      text: available("DSQ"),
    },
    points: available(0),
    lapsCompleted: { status: "missing" },
    finishStatus: { kind: "disqualified", text: available("Disqualified") },
    time: { status: "not-applicable" },
    fastestLap: { status: "missing" },
  }),
];

export const sampleQualifyingResults: readonly QualifyingResult[] = [
  {
    sessionId: createSessionId(sampleRegularEvent.id, "qualifying"),
    driver: sampleDriverEntry,
    constructor: available(sampleConstructor),
    classification: { position: available(1), text: available("1") },
    format: "three-stage",
    stages: [
      { id: "q1", name: "Q1", time: available({ milliseconds: 89_000 }) },
      { id: "q2", name: "Q2", time: available({ milliseconds: 88_500 }) },
      { id: "q3", name: "Q3", time: available({ milliseconds: 88_100 }) },
    ],
  },
  {
    sessionId: createSessionId(sampleRegularEvent.id, "qualifying"),
    driver: {
      ...sampleDriverEntry,
      driver: {
        ...sampleDriver,
        id: "driver:sample-no-time",
        givenName: "No-time",
      },
    },
    constructor: { status: "missing" },
    classification: {
      position: { status: "missing" },
      text: available("No time"),
    },
    format: "three-stage",
    stages: [
      {
        id: "q1",
        name: "Q1",
        time: { status: "unavailable", reason: "unknown" },
      },
    ],
  },
];

export const sampleOtherFormatQualifying: readonly QualifyingResult[] = [
  {
    sessionId: createSessionId(sampleRegularEvent.id, "qualifying"),
    driver: sampleDriverEntry,
    constructor: available(sampleConstructor),
    classification: { position: available(1), text: available("1") },
    format: "other",
    stages: [
      {
        id: "stage:single",
        name: "Single recorded session",
        time: available({ milliseconds: 89_500 }),
      },
    ],
  },
];

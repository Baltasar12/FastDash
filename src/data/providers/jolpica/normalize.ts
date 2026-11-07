import "./server-only";
import type {
  Classification,
  Constructor,
  ConstructorStanding,
  DriverSeason,
  DriverStanding,
  FastestLap,
  FinishStatus,
  GrandPrix,
  QualifyingResult,
  RaceResult,
  RaceTime,
  Season,
  Session,
  SessionKind,
  SessionStart,
} from "@/types/f1";
import { createEventId, createSessionId } from "@/types/f1-identifiers";
import {
  array,
  available,
  date,
  decimal,
  duration,
  field,
  identifier,
  integer,
  invalid,
  missing,
  notApplicable,
  object,
  string,
  utcTime,
  year,
} from "./validation";

export function season(value: unknown): Season {
  return {
    year: year(object(value).season),
    events: missing,
    championship: { status: "unavailable", reason: "not-covered" },
  };
}

function constructor(value: unknown): Constructor {
  const row = object(value);
  return {
    id: `constructor:jolpica:${identifier(row.constructorId)}`,
    name: string(row.name),
    nationality: field(row.nationality, string),
  };
}

function driver(
  value: unknown,
  season: number,
  number?: unknown,
): DriverSeason {
  const row = object(value);
  return {
    season,
    driver: {
      id: `driver:jolpica:${identifier(row.driverId)}`,
      givenName: string(row.givenName),
      familyName: string(row.familyName),
      nationality: field(row.nationality, string),
    },
    code: field(row.code, string),
    racingNumber: field(number, integer),
  };
}

function start(
  row: Record<string, unknown>,
): ReturnType<typeof available<SessionStart>> | typeof missing {
  if (row.date === undefined) {
    if (row.time !== undefined) invalid();
    return missing;
  }
  const day = date(row.date);
  return available(
    row.time === undefined
      ? { precision: "date", date: day }
      : { precision: "instant", at: `${day}T${utcTime(row.time)}` },
  );
}

export function event(
  value: unknown,
  expectedSeason: number,
  expectedRound?: number,
): GrandPrix {
  const row = object(value);
  const season = year(row.season);
  const round = integer(row.round, 1);
  if (
    season !== expectedSeason ||
    (expectedRound !== undefined && round !== expectedRound)
  )
    invalid();
  const id = createEventId(season, round);
  const circuit = object(row.Circuit);
  const location =
    circuit.Location === undefined ? undefined : object(circuit.Location);
  const sessions: Session[] = [];
  const add = (
    kind: SessionKind,
    name: string,
    schedule: Record<string, unknown>,
  ) => {
    if (sessions.some((item) => item.kind === kind)) invalid();
    sessions.push({
      id: createSessionId(id, kind),
      eventId: id,
      kind,
      name: available(name),
      start: start(schedule),
      status: "unknown",
    });
  };
  // The returned Race itself is authoritative evidence for the main race.
  add("race", "Race", row);
  const keys = [
    ["FirstPractice", "practice-1", "First Practice"],
    ["SecondPractice", "practice-2", "Second Practice"],
    ["ThirdPractice", "practice-3", "Third Practice"],
    ["Qualifying", "qualifying", "Qualifying"],
    ["Sprint", "sprint", "Sprint"],
    ["SprintQualifying", "sprint-qualifying", "Sprint Qualifying"],
    ["SprintShootout", "sprint-qualifying", "Sprint Shootout"],
  ] as const;
  for (const [key, kind, name] of keys)
    if (row[key] !== undefined) add(kind, name, object(row[key]));
  return {
    id,
    season,
    round,
    name: string(row.raceName),
    circuit: {
      id: `circuit:jolpica:${identifier(circuit.circuitId)}`,
      name: string(circuit.circuitName),
      country: field(location?.country, string),
      locality: field(location?.locality, string),
    },
    date: field(row.date, date),
    sessions: available(sessions),
  };
}

function classification(row: Record<string, unknown>): Classification {
  const text = field(row.positionText, string);
  return {
    position:
      text.status === "available" && !/^\d+$/.test(text.value)
        ? notApplicable
        : field(row.position, (value) => integer(value, 1)),
    text,
  };
}

function standingPosition(row: Record<string, unknown>) {
  if (
    row.positionText !== undefined &&
    row.positionText !== null &&
    /^(?:E|D|-)$/i.test(string(row.positionText))
  )
    return notApplicable;
  return field(row.position, (value) => integer(value, 1));
}

export function driverStanding(
  value: unknown,
  season: number,
  round: unknown,
): DriverStanding {
  const row = object(value);
  return {
    season,
    asOfRound: field(round, integer),
    position: standingPosition(row),
    driver: driver(row.Driver, season),
    constructors: field(row.Constructors, (items) =>
      array(items).map(constructor),
    ),
    points: field(row.points, decimal),
    wins: field(row.wins, integer),
  };
}

export function constructorStanding(
  value: unknown,
  season: number,
  round: unknown,
): ConstructorStanding {
  const row = object(value);
  return {
    season,
    asOfRound: field(round, integer),
    position: standingPosition(row),
    constructor: constructor(row.Constructor),
    points: field(row.points, decimal),
    wins: field(row.wins, integer),
  };
}

function finish(value: unknown): FinishStatus {
  if (value === undefined) return { kind: "unknown", text: missing };
  const text = string(value);
  let kind: FinishStatus["kind"] = "unknown";
  if (text === "Finished" || text === "Lapped" || /^\+\d+ Laps?$/.test(text))
    kind = "finished";
  else if (/^(?:Disqualified|DSQ)$/i.test(text)) kind = "disqualified";
  else if (/^(?:Did[ _]not[ _]start|Withdrawn|DNS)$/i.test(text))
    kind = "did-not-start";
  else if (
    /^(?:Not classified|Did[ _]not[ _]qualify|Did[ _]not[ _]prequalify)$/i.test(
      text,
    )
  )
    kind = "not-classified";
  else if (
    /^(?:Retired|Accident|Collision|Collision damage|Engine|Gearbox|Transmission|Clutch|Hydraulics|Electrical|Spun off|Suspension|Brakes|Overheating|Mechanical|Tyre|Puncture|Fuel pressure|Fuel system|Water leak|Oil leak|Wheel|Exhaust|Power Unit)$/i.test(
      text,
    )
  )
    kind = "retired";
  return { kind, text: available(text) };
}

function raceTime(
  row: Record<string, unknown>,
  finishKind: FinishStatus["kind"],
): RaceResult["time"] {
  if (row.Time !== undefined) {
    const time = object(row.Time);
    const millis = time.millis === undefined ? undefined : integer(time.millis);
    const display =
      time.time === undefined || time.time === ""
        ? undefined
        : string(time.time);
    if (display?.startsWith("+"))
      return available<RaceTime>({
        kind: "gap",
        milliseconds: duration(display.slice(1)),
      });
    // Upstream's whole-second display slicing can truncate elapsed text.
    // The numeric millis value remains authoritative; plus-prefixed gaps above
    // have separate source meaning and never use elapsed millis as a gap.
    if (millis !== undefined)
      return available<RaceTime>({ kind: "elapsed", milliseconds: millis });
    if (display !== undefined)
      return available<RaceTime>({
        kind: "elapsed",
        milliseconds: duration(display),
      });
    return missing;
  }
  if (typeof row.status === "string") {
    const lapped = /^\+(\d+) Laps?$/.exec(row.status);
    if (lapped)
      return available<RaceTime>({
        kind: "laps-down",
        laps: integer(lapped[1], 1),
      });
  }
  if (finishKind === "did-not-start") return notApplicable;
  return missing;
}

function fastest(value: unknown): FastestLap {
  const row = object(value);
  const time = row.Time === undefined ? undefined : object(row.Time);
  const speed =
    row.AverageSpeed === undefined ? undefined : object(row.AverageSpeed);
  if (speed !== undefined && speed.units !== "kph") invalid();
  return {
    lapNumber: field(row.lap, (value) => integer(value, 1)),
    rank: field(row.rank, (value) => integer(value, 1)),
    time: field(time?.time, (value) => ({ milliseconds: duration(value) })),
    averageSpeed: field(speed?.speed, (value) => {
      const parsed = decimal(value);
      if (parsed < 0) invalid();
      return { kilometersPerHour: parsed };
    }),
  };
}

export function raceResult(
  value: unknown,
  season: number,
  round: number,
): RaceResult {
  const row = object(value);
  const grid =
    row.grid === undefined || row.grid === null ? undefined : integer(row.grid);
  const finishStatus = finish(row.status);
  return {
    sessionId: createSessionId(createEventId(season, round), "race"),
    driver: driver(row.Driver, season, row.number),
    constructor: field(row.Constructor, constructor),
    grid:
      grid === undefined || grid === 0
        ? missing
        : available({ kind: "position", position: grid }),
    classification: classification(row),
    points: field(row.points, decimal),
    lapsCompleted: field(row.laps, integer),
    finishStatus,
    time: raceTime(row, finishStatus.kind),
    fastestLap: field(row.FastestLap, fastest),
  };
}

export function qualifyingResult(
  value: unknown,
  season: number,
  round: number,
): QualifyingResult {
  const row = object(value);
  const stages: QualifyingResult["stages"][number][] = [];
  for (const [sourceKey, id] of [
    ["Q1", "q1"],
    ["Q2", "q2"],
    ["Q3", "q3"],
  ] as const) {
    if (row[sourceKey] === undefined) continue;
    const supplied = row[sourceKey];
    stages.push({
      id,
      name: sourceKey,
      time:
        supplied === "" || supplied === null
          ? missing
          : available({ milliseconds: duration(supplied) }),
    });
  }
  return {
    sessionId: createSessionId(createEventId(season, round), "qualifying"),
    driver: driver(row.Driver, season, row.number),
    constructor: field(row.Constructor, constructor),
    classification: classification(row),
    format: "unknown",
    stages,
  };
}

/** Shared normalized contracts, revision 1. Never provider wire payloads. */
export const F1_CONTRACT_VERSION = 1;

/** Integer championship year; adapters validate supported coverage separately. */
export type SeasonYear = number;
export type DriverId = `driver:${string}`;
export type ConstructorId = `constructor:${string}`;
export type CircuitId = `circuit:${string}`;
export type EventId = `f1:${number}:${number}`;
export type SessionId = `${EventId}:${SessionKind}`;

/** Gregorian YYYY-MM-DD, without a time or implied UTC midnight. */
export type ISODate = string;
/** ISO 8601 UTC instant with Z suffix; never a local time without an offset. */
export type UTCDateTime = string;

/** Required field wrapper: omission, unavailable coverage and inapplicability differ. */
export type FieldValue<T> =
  | { readonly status: "available"; readonly value: T }
  | { readonly status: "missing" }
  | {
      readonly status: "unavailable";
      readonly reason: "not-covered" | "not-published" | "unknown";
    }
  | { readonly status: "not-applicable" };

/** Numeric values preserve source precision; no fabricated sub-millisecond digits. */
export interface Duration {
  readonly milliseconds: number;
}

export interface Driver {
  readonly id: DriverId;
  readonly givenName: string;
  readonly familyName: string;
  readonly nationality: FieldValue<string>;
}

/** Number/code belong to a season or event entry, never a global driver identity. */
export interface DriverSeason {
  readonly season: SeasonYear;
  readonly driver: Driver;
  readonly code: FieldValue<string>;
  readonly racingNumber: FieldValue<number>;
}

export interface Constructor {
  readonly id: ConstructorId;
  readonly name: string;
  readonly nationality: FieldValue<string>;
  /** Optional original, project-owned visual metadata; no team logo/brand assets. */
  readonly visual?: { readonly accentToken: string };
}

export interface Circuit {
  readonly id: CircuitId;
  readonly name: string;
  readonly country: FieldValue<string>;
  readonly locality: FieldValue<string>;
}

export const SESSION_KINDS = [
  "practice-1",
  "practice-2",
  "practice-3",
  "qualifying",
  "sprint-qualifying",
  "sprint",
  "race",
] as const;

/** sprint-qualifying also normalizes the historical Sprint Shootout label. */
export type SessionKind = (typeof SESSION_KINDS)[number];

export type SessionStart =
  | { readonly precision: "date"; readonly date: ISODate }
  | { readonly precision: "instant"; readonly at: UTCDateTime };

export interface Session {
  readonly id: SessionId;
  readonly eventId: EventId;
  readonly kind: SessionKind;
  readonly name: FieldValue<string>;
  /** Reported scheduled start; never substitute an inferred actual start. */
  readonly start: FieldValue<SessionStart>;
  readonly status: "scheduled" | "completed" | "cancelled" | "unknown";
}

export interface GrandPrix {
  readonly id: EventId;
  readonly season: SeasonYear;
  readonly round: number;
  readonly name: string;
  readonly circuit: Circuit;
  /** Event's reported calendar date; do not derive a UTC midnight from this. */
  readonly date: FieldValue<ISODate>;
  /** Only reported sessions; missing sessions must never be synthesized. */
  readonly sessions: FieldValue<readonly Session[]>;
}

export interface ChampionshipMetadata {
  /** Include only when supplied by a verified source. */
  readonly name: FieldValue<string>;
  readonly status: "upcoming" | "in-progress" | "completed" | "unknown";
}

export interface Season {
  readonly year: SeasonYear;
  /** Supported-season discovery may have no calendar details yet. */
  readonly events: FieldValue<readonly GrandPrix[]>;
  readonly championship: FieldValue<ChampionshipMetadata>;
}

export interface Classification {
  /** not-applicable for a nonnumeric classification; missing if unknown. */
  readonly position: FieldValue<number>;
  /** Retain meaningful source classification, e.g. R, DNS, DSQ. */
  readonly text: FieldValue<string>;
}

export interface DriverStanding {
  readonly season: SeasonYear;
  /** Source-reported completed round for this snapshot, not calendar inference. */
  readonly asOfRound: FieldValue<number>;
  readonly position: FieldValue<number>;
  readonly driver: DriverSeason;
  /** A driver can represent multiple constructors in a single championship. */
  readonly constructors: FieldValue<readonly Constructor[]>;
  readonly points: FieldValue<number>;
  readonly wins: FieldValue<number>;
}

export interface ConstructorStanding {
  readonly season: SeasonYear;
  readonly asOfRound: FieldValue<number>;
  readonly position: FieldValue<number>;
  readonly constructor: Constructor;
  readonly points: FieldValue<number>;
  readonly wins: FieldValue<number>;
}

export type GridPosition =
  | { readonly kind: "position"; readonly position: number }
  | { readonly kind: "pit-lane" };

export interface FinishStatus {
  readonly kind:
    | "finished"
    | "retired"
    | "did-not-start"
    | "disqualified"
    | "not-classified"
    | "unknown";
  /** Preserve descriptive source status without making consumers parse it. */
  readonly text: FieldValue<string>;
}

export type RaceTime =
  | { readonly kind: "elapsed"; readonly milliseconds: number }
  | { readonly kind: "gap"; readonly milliseconds: number }
  | { readonly kind: "laps-down"; readonly laps: number };

export interface FastestLap {
  readonly lapNumber: FieldValue<number>;
  readonly rank: FieldValue<number>;
  readonly time: FieldValue<Duration>;
  readonly averageSpeed: FieldValue<{ readonly kilometersPerHour: number }>;
}

export interface RaceResult {
  readonly sessionId: SessionId;
  readonly driver: DriverSeason;
  readonly constructor: FieldValue<Constructor>;
  readonly grid: FieldValue<GridPosition>;
  readonly classification: Classification;
  readonly points: FieldValue<number>;
  readonly lapsCompleted: FieldValue<number>;
  readonly finishStatus: FinishStatus;
  readonly time: FieldValue<RaceTime>;
  readonly fastestLap: FieldValue<FastestLap>;
}

export type QualifyingStageId = "q1" | "q2" | "q3" | `stage:${string}`;

export interface QualifyingStage {
  /** Stable source-normalized stage key, unique within this driver's result. */
  readonly id: QualifyingStageId;
  readonly name: string;
  readonly time: FieldValue<Duration>;
}

export interface QualifyingResult {
  readonly sessionId: SessionId;
  readonly driver: DriverSeason;
  readonly constructor: FieldValue<Constructor>;
  readonly classification: Classification;
  readonly format: "three-stage" | "other" | "unknown";
  /** Reported stages only. Absence does not imply zero or participation. */
  readonly stages: readonly QualifyingStage[];
}

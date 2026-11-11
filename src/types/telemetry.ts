import type {
  CircuitId,
  Driver,
  DriverId,
  EventId,
  FieldValue,
  SessionId,
  SessionKind,
} from "@/types/f1";

/** Independent of F1_CONTRACT_VERSION; JSON-safe telemetry capability revision. */
export const TELEMETRY_CONTRACT_VERSION = 1;
export const TELEMETRY_CHANNELS = [
  "speed",
  "throttle",
  "brake",
  "gear",
] as const;
export type TelemetryChannel = (typeof TELEMETRY_CHANNELS)[number];
export type TelemetryEntryId = `${SessionId}:entry:${string}`;
export type TelemetryLapId = `${TelemetryEntryId}:lap:${number}`;

export interface MappingEvidence {
  readonly revision: string;
  readonly method: "curated" | "corroborated" | "synthetic";
  /** Evidence identifiers, never arbitrary upstream URLs or personal data. */
  readonly evidence: readonly string[];
}
export type IdentityMapping<Canonical extends string, Reference> =
  | {
      readonly status: "verified";
      readonly canonicalId: Canonical;
      readonly reference: Reference;
      readonly provenance: MappingEvidence;
    }
  | {
      readonly status: "ambiguous";
      readonly candidates: readonly Canonical[];
      readonly reference: Reference;
      readonly provenance: MappingEvidence;
    }
  | {
      readonly status: "unmapped";
      readonly reference: Reference;
      readonly provenance: MappingEvidence;
    };

export interface OpenF1MeetingReference {
  readonly provider: "openf1";
  readonly meetingKey: number;
}
export interface OpenF1SessionReference extends OpenF1MeetingReference {
  readonly sessionKey: number;
}
export interface OpenF1EntryReference extends OpenF1SessionReference {
  readonly driverNumber: number;
}

export interface TelemetryEvent {
  readonly id: EventId;
  readonly season: number;
  readonly round: number;
  readonly name: string;
  readonly circuitId: CircuitId;
  readonly circuitConfiguration: FieldValue<string>;
  readonly mapping: IdentityMapping<EventId, OpenF1MeetingReference>;
  readonly sessions: readonly TelemetrySession[];
}
export interface TelemetrySession {
  readonly id: SessionId;
  readonly eventId: EventId;
  readonly kind: SessionKind;
  readonly sourceLabel: string;
  readonly scheduledStart: FieldValue<SourceTimestamp>;
  readonly actualStart: FieldValue<SourceTimestamp>;
  readonly status: "completed" | "cancelled" | "unknown";
  readonly mapping: IdentityMapping<SessionId, OpenF1SessionReference>;
  readonly coverage: TelemetryCoverage;
}
export interface TelemetryEntry {
  readonly id: TelemetryEntryId;
  readonly sessionId: SessionId;
  readonly driver: Driver;
  readonly racingNumber: FieldValue<number>;
  readonly mapping: IdentityMapping<DriverId, OpenF1EntryReference>;
  readonly coverage: TelemetryCoverage;
}

export type AbsenceReason =
  | "source-missing"
  | "not-recorded"
  | "not-supported"
  | "invalid"
  | "not-requested"
  | "outside-window";
export type Reading<T> =
  | { readonly status: "available"; readonly value: T }
  | { readonly status: "missing"; readonly reason: AbsenceReason };
export type ValueOrigin = "observed" | "derived" | "synthetic";
export interface SourceTimestamp {
  /** Exact source UTC ISO text, including its fractional digits. Z or +00:00. */
  readonly original: string;
  /** Textual precision only; never a claim of clock or measurement accuracy. */
  readonly fractionalSecondDigits: number;
}
export interface ReportedDuration {
  readonly milliseconds: number;
  readonly sourceSeconds: number;
  readonly resolutionMilliseconds: FieldValue<number>;
  readonly origin: "reported" | "synthetic";
}
export interface LapBoundary {
  readonly timestamp: Reading<SourceTimestamp>;
  readonly method:
    | "source-approximate"
    | "reported"
    | "derived-duration"
    | "synthetic"
    | "unknown";
  readonly uncertaintyMilliseconds: FieldValue<number>;
}
export interface TelemetryLap {
  readonly id: TelemetryLapId;
  readonly sessionId: SessionId;
  readonly entryId: TelemetryEntryId;
  readonly lapNumber: number;
  readonly qualifyingStage: FieldValue<string>;
  readonly duration: Reading<ReportedDuration>;
  readonly sectors: readonly {
    readonly sector: number;
    readonly duration: Reading<ReportedDuration>;
  }[];
  readonly start: LapBoundary;
  readonly end: LapBoundary;
  readonly pitOut: FieldValue<boolean>;
  readonly pitIn: FieldValue<boolean>;
  readonly validity: "valid" | "invalid" | "deleted" | "unknown";
  readonly coverage: TelemetryCoverage;
}
export interface ChannelValues {
  readonly speed: Reading<number>;
  readonly throttle: Reading<number>;
  readonly brake: Reading<boolean>;
  readonly gear: Reading<number>;
}
export interface TelemetrySample {
  readonly timestamp: SourceTimestamp;
  /** null only when no usable lap start exists, never substitute a zero. */
  readonly elapsedMilliseconds: number | null;
  /** Zero-based source response index, retained after stable chronological sorting. */
  readonly sourceIndex: number;
  readonly origin: ValueOrigin;
  readonly values: ChannelValues;
}
export interface ChannelDefinition {
  readonly unit: "km/h" | "percent" | "boolean" | "integer";
  readonly semantics:
    | "speed"
    | "maximum-engine-power-percent"
    | "brake-engaged"
    | "gear-neutral-zero";
  readonly resolution: FieldValue<number>;
  readonly measurementAccuracy: FieldValue<number>;
}
/** Channel names fix unit and meaning; adapters cannot accidentally relabel a signal. */
export interface TelemetryChannelDefinitions {
  readonly speed: ChannelDefinition & {
    readonly unit: "km/h";
    readonly semantics: "speed";
  };
  readonly throttle: ChannelDefinition & {
    readonly unit: "percent";
    readonly semantics: "maximum-engine-power-percent";
  };
  readonly brake: ChannelDefinition & {
    readonly unit: "boolean";
    readonly semantics: "brake-engaged";
  };
  readonly gear: ChannelDefinition & {
    readonly unit: "integer";
    readonly semantics: "gear-neutral-zero";
  };
}

export interface TelemetryCoverage {
  readonly status: "available" | "partial" | "unavailable" | "unknown";
  readonly channels: Readonly<
    Record<
      TelemetryChannel,
      "available" | "partial" | "unavailable" | "unknown"
    >
  >;
}
export type TelemetryWarning =
  | "approximate-lap-start"
  | "missing-interval"
  | "partial-boundary"
  | "identity-unmapped"
  | "unsynchronized"
  | "invalid-lap"
  | "reduced-for-display"
  | "rejected-samples"
  | "duplicate-timestamp"
  | "out-of-order"
  | "unavailable-channel"
  | "timestamp-uncertainty";
export interface MissingInterval {
  readonly startMilliseconds: number;
  readonly endMilliseconds: number;
  readonly channels: readonly TelemetryChannel[];
  readonly reason: AbsenceReason;
}
export interface RejectedSample {
  readonly sourceIndex: number;
  readonly reason:
    | "missing-timestamp"
    | "invalid-timestamp"
    | "duplicate-timestamp"
    | "outside-window"
    | "invalid-value";
  /** Present only for a rejected channel in a retained row. */
  readonly channel?: TelemetryChannel;
}
export interface TelemetryQuality {
  readonly completeness: "complete" | "partial" | "unknown";
  readonly sourceFinality: "final" | "provisional" | "unknown";
  readonly boundaryCoverage: "complete" | "partial" | "unknown";
  readonly missingIntervals: readonly MissingInterval[];
  readonly rejectedSamples: readonly RejectedSample[];
  readonly warnings: readonly TelemetryWarning[];
  readonly timestampUncertaintyMilliseconds: FieldValue<number>;
  readonly observedCadenceMilliseconds: FieldValue<number>;
  readonly maximumGapMilliseconds: FieldValue<number>;
  /** No percentage without a documented coverage method; cadence is not assumed. */
  readonly coverageFraction: FieldValue<number>;
  readonly coverageMethod: "validated-intervals" | "unknown";
  readonly interpolation: "none";
}
export interface DownsamplingMetadata {
  readonly algorithm: "none" | "preserve-features-v1";
  readonly inputCount: number;
  readonly outputCount: number;
  readonly budget: number;
  readonly retained: readonly (
    | "extrema"
    | "interval-boundaries"
    | "gap-edges"
    | "gear-transitions"
    | "brake-transitions"
  )[];
}
export interface LapTelemetry {
  readonly lap: TelemetryLap;
  readonly channels: TelemetryChannelDefinitions;
  readonly samples: readonly TelemetrySample[];
  readonly quality: TelemetryQuality;
  readonly reduction: DownsamplingMetadata;
}
export type TelemetryAlignment =
  | {
      readonly status: "available" | "degraded";
      readonly method: "lap-elapsed-time";
      readonly equalTrackPosition: false;
      readonly origins: readonly [LapBoundary, LapBoundary];
      readonly validIntervals: readonly [
        readonly {
          readonly startMilliseconds: number;
          readonly endMilliseconds: number;
        }[],
        readonly {
          readonly startMilliseconds: number;
          readonly endMilliseconds: number;
        }[],
      ];
    }
  | {
      readonly status: "unavailable";
      readonly method: "none";
      readonly reason:
        "missing-boundary" | "invalid-boundary" | "insufficient-coverage";
    };
export interface TelemetryComparison {
  readonly sessionId: SessionId;
  readonly laps: readonly [LapTelemetry, LapTelemetry];
  /** B minus A, scalar reported whole-lap timing only. */
  readonly lapDifferenceMilliseconds: Reading<number>;
  readonly alignment: TelemetryAlignment;
  readonly continuousDistanceDelta: {
    readonly status: "unavailable";
    readonly reason: "validated-distance-alignment-required";
  };
}

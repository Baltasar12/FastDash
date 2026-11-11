/** Wholly invented event, people and traces. Never provider recordings or production fallback. */
import type { Driver, FieldValue, SessionId } from "@/types/f1";
import { createEventId, createSessionId } from "@/types/f1-identifiers";
import type { DataSource, ResponseMetadata } from "@/types/f1-provider";
import type {
  TelemetryChannelDefinitions,
  LapTelemetry,
  MappingEvidence,
  Reading,
  SourceTimestamp,
  TelemetryCoverage,
  TelemetryEntry,
  TelemetryEvent,
  TelemetryLap,
  TelemetrySample,
} from "@/types/telemetry";
import type { TelemetryComparisonRequest } from "@/types/telemetry-provider";
import {
  createTelemetryEntryId,
  createTelemetryLapId,
} from "@/types/telemetry-identifiers";
import { reportedSeconds } from "@/types/telemetry-validation";
import type { TelemetrySampleInput } from "@/types/telemetry-validation";

export const SYNTHETIC_TELEMETRY_LABEL =
  "SYNTHETIC TELEMETRY — invented event, people and measurements";
export const SYNTHETIC_TELEMETRY_SEASON = 2024;
export const syntheticTelemetrySource: DataSource = {
  id: "synthetic-telemetry-contract-v1",
  name: SYNTHETIC_TELEMETRY_LABEL,
  kind: "synthetic",
  attribution: [SYNTHETIC_TELEMETRY_LABEL],
};
export const syntheticTelemetryMetadata: ResponseMetadata = {
  source: syntheticTelemetrySource,
  retrievedAt: "2024-03-03T00:00:00Z",
  freshness: "fresh",
  cache: "bypass",
  finality: "unknown",
  completeness: "complete",
};
export const syntheticMappingEvidence: MappingEvidence = {
  revision: "synthetic-mapping-v1",
  method: "synthetic",
  evidence: ["invented-contract-fixture-only"],
};
export const syntheticEventId = createEventId(SYNTHETIC_TELEMETRY_SEASON, 1);
export const syntheticRaceSessionId = createSessionId(syntheticEventId, "race");
export const syntheticQualifyingSessionId = createSessionId(
  syntheticEventId,
  "qualifying",
);
export function available<T>(value: T): FieldValue<T> {
  return { status: "available", value };
}
export function reading<T>(value: T): Reading<T> {
  return { status: "available", value };
}
export const syntheticCompleteCoverage: TelemetryCoverage = {
  status: "available",
  channels: {
    speed: "available",
    throttle: "available",
    brake: "available",
    gear: "available",
  },
};
export function syntheticTimestamp(milliseconds: number): SourceTimestamp {
  const original = new Date(Date.UTC(2024, 2, 1, 12) + milliseconds)
    .toISOString()
    .replace(".000Z", ".000000Z");
  return {
    original,
    fractionalSecondDigits:
      original.split(".")[1]?.replace("Z", "").length ?? 0,
  };
}
export const syntheticEvent: TelemetryEvent = {
  id: syntheticEventId,
  season: SYNTHETIC_TELEMETRY_SEASON,
  round: 1,
  name: "SYNTHETIC — Example Circuit Grand Prix",
  circuitId: "circuit:synthetic-example",
  circuitConfiguration: available("synthetic-configuration-v1"),
  mapping: {
    status: "verified",
    canonicalId: syntheticEventId,
    reference: { provider: "openf1", meetingKey: 900001 },
    provenance: syntheticMappingEvidence,
  },
  sessions: [syntheticRaceSessionId, syntheticQualifyingSessionId].map(
    (id) => ({
      id,
      eventId: syntheticEventId,
      kind: id === syntheticRaceSessionId ? "race" : "qualifying",
      sourceLabel:
        id === syntheticRaceSessionId
          ? "SYNTHETIC Race"
          : "SYNTHETIC Qualifying",
      scheduledStart: available(syntheticTimestamp(0)),
      actualStart: available(syntheticTimestamp(0)),
      status: "completed",
      mapping: {
        status: "verified",
        canonicalId: id,
        reference: {
          provider: "openf1",
          meetingKey: 900001,
          sessionKey: id === syntheticRaceSessionId ? 900002 : 900003,
        },
        provenance: syntheticMappingEvidence,
      },
      coverage: syntheticCompleteCoverage,
    }),
  ),
};
export const syntheticDrivers: readonly [Driver, Driver] = [
  {
    id: "driver:synthetic-ada",
    givenName: "Ada",
    familyName: "Example",
    nationality: { status: "missing" },
  },
  {
    id: "driver:synthetic-rio",
    givenName: "Rio",
    familyName: "Example",
    nationality: { status: "missing" },
  },
];
export function syntheticEntries(
  sessionId: SessionId,
): readonly [TelemetryEntry, TelemetryEntry] {
  function entry(driver: Driver, driverNumber: number): TelemetryEntry {
    return {
      id: createTelemetryEntryId(sessionId, driver.id),
      sessionId,
      driver,
      racingNumber: available(driverNumber),
      mapping: {
        status: "verified",
        canonicalId: driver.id,
        reference: {
          provider: "openf1",
          meetingKey: 900001,
          sessionKey: sessionId === syntheticRaceSessionId ? 900002 : 900003,
          driverNumber,
        },
        provenance: syntheticMappingEvidence,
      },
      coverage: syntheticCompleteCoverage,
    };
  }
  return [entry(syntheticDrivers[0], 91), entry(syntheticDrivers[1], 92)];
}
const definitionPrecision = {
  resolution: available(1),
  measurementAccuracy: { status: "missing" },
} as const;
export const syntheticChannelDefinitions: TelemetryChannelDefinitions = {
  speed: { unit: "km/h", semantics: "speed", ...definitionPrecision },
  throttle: {
    unit: "percent",
    semantics: "maximum-engine-power-percent",
    ...definitionPrecision,
  },
  brake: {
    unit: "boolean",
    semantics: "brake-engaged",
    ...definitionPrecision,
  },
  gear: {
    unit: "integer",
    semantics: "gear-neutral-zero",
    ...definitionPrecision,
  },
};
export function syntheticLap(
  entry: TelemetryEntry,
  lapNumber: number,
): TelemetryLap {
  const other = entry.driver.id === syntheticDrivers[1].id;
  const duration = other ? 13.2 : 12;
  return {
    id: createTelemetryLapId(entry.id, lapNumber),
    sessionId: entry.sessionId,
    entryId: entry.id,
    lapNumber,
    qualifyingStage:
      entry.sessionId === syntheticQualifyingSessionId
        ? available("q1")
        : { status: "not-applicable" },
    duration: reading(reportedSeconds(duration, 0.001, "synthetic")),
    sectors: [1, 2, 3].map((sector) => ({
      sector,
      duration: reading(reportedSeconds(duration / 3, 0.001, "synthetic")),
    })),
    start: {
      timestamp: reading(
        syntheticTimestamp(lapNumber * 60000 + (other ? 15000 : 0)),
      ),
      method: "synthetic",
      uncertaintyMilliseconds: available(0),
    },
    end: {
      timestamp: reading(
        syntheticTimestamp(
          lapNumber * 60000 + (other ? 15000 : 0) + duration * 1000,
        ),
      ),
      method: "synthetic",
      uncertaintyMilliseconds: available(0),
    },
    pitOut: available(false),
    pitIn: { status: "missing" },
    validity: "valid",
    coverage: syntheticCompleteCoverage,
  };
}
export function syntheticLapTelemetry(
  entry: TelemetryEntry,
  lapNumber = 10,
): LapTelemetry {
  const lap = syntheticLap(entry, lapNumber);
  const other = entry.driver.id === syntheticDrivers[1].id;
  const cadence = other ? 1200 : 1000;
  const duration = other ? 13200 : 12000;
  const origin = lapNumber * 60000 + (other ? 15000 : 0);
  const samples = Array.from(
    { length: duration / cadence + 1 },
    (_, sourceIndex): TelemetrySample => ({
      timestamp: syntheticTimestamp(origin + sourceIndex * cadence),
      elapsedMilliseconds: sourceIndex * cadence,
      sourceIndex,
      origin: "synthetic",
      values: {
        speed: reading(sourceIndex === 0 ? 0 : 80 + (sourceIndex % 5) * 45),
        throttle: reading(sourceIndex % 4 === 0 ? 0 : 100),
        brake: reading(sourceIndex % 4 === 0),
        gear: reading(sourceIndex === 0 ? 0 : 2 + (sourceIndex % 7)),
      },
    }),
  );
  return {
    lap,
    channels: syntheticChannelDefinitions,
    samples,
    quality: {
      completeness: "complete",
      sourceFinality: "unknown",
      boundaryCoverage: "complete",
      missingIntervals: [],
      rejectedSamples: [],
      warnings: [],
      timestampUncertaintyMilliseconds: available(0),
      observedCadenceMilliseconds: available(cadence),
      maximumGapMilliseconds: available(cadence),
      coverageFraction: available(1),
      coverageMethod: "validated-intervals",
      interpolation: "none",
    },
    reduction: {
      algorithm: "none",
      inputCount: samples.length,
      outputCount: samples.length,
      budget: 600,
      retained: [],
    },
  };
}
export const syntheticCompleteLap = syntheticLapTelemetry(
  syntheticEntries(syntheticRaceSessionId)[0],
);
export const syntheticOtherCadenceLap = syntheticLapTelemetry(
  syntheticEntries(syntheticRaceSessionId)[1],
);
export const syntheticGapLap: LapTelemetry = {
  ...syntheticOtherCadenceLap,
  lap: {
    ...syntheticOtherCadenceLap.lap,
    coverage: {
      status: "partial",
      channels: {
        speed: "partial",
        throttle: "partial",
        brake: "partial",
        gear: "partial",
      },
    },
  },
  samples: syntheticOtherCadenceLap.samples.filter(
    (sample) => sample.sourceIndex < 4 || sample.sourceIndex > 6,
  ),
  quality: {
    ...syntheticOtherCadenceLap.quality,
    completeness: "partial",
    missingIntervals: [
      {
        startMilliseconds: 3600,
        endMilliseconds: 8400,
        channels: ["speed", "throttle", "brake", "gear"],
        reason: "not-recorded",
      },
    ],
    warnings: ["missing-interval"],
    maximumGapMilliseconds: available(4800),
    coverageFraction: { status: "missing" },
    coverageMethod: "unknown",
  },
  reduction: {
    ...syntheticOtherCadenceLap.reduction,
    inputCount: 9,
    outputCount: 9,
  },
};
export const syntheticMissingBoundaryLap: LapTelemetry = {
  ...syntheticCompleteLap,
  lap: {
    ...syntheticCompleteLap.lap,
    start: {
      timestamp: { status: "missing", reason: "source-missing" },
      method: "unknown",
      uncertaintyMilliseconds: { status: "missing" },
    },
  },
  samples: syntheticCompleteLap.samples.map((sample) => ({
    ...sample,
    elapsedMilliseconds: null,
  })),
  quality: {
    ...syntheticCompleteLap.quality,
    completeness: "partial",
    boundaryCoverage: "partial",
    timestampUncertaintyMilliseconds: { status: "missing" },
    warnings: ["partial-boundary", "timestamp-uncertainty"],
    coverageFraction: { status: "missing" },
    coverageMethod: "unknown",
  },
};
export const syntheticInvalidBoundaryLap: LapTelemetry = {
  ...syntheticCompleteLap,
  lap: {
    ...syntheticCompleteLap.lap,
    end: {
      ...syntheticCompleteLap.lap.end,
      timestamp: reading(syntheticTimestamp(0)),
    },
  },
  quality: {
    ...syntheticCompleteLap.quality,
    completeness: "partial",
    boundaryCoverage: "partial",
    timestampUncertaintyMilliseconds: { status: "missing" },
    warnings: ["partial-boundary", "timestamp-uncertainty"],
    coverageFraction: { status: "missing" },
    coverageMethod: "unknown",
  },
};
/** Deliberately invalid normalization inputs, never serialized as valid telemetry. */
export const syntheticTimestampAnomalies: {
  readonly source: DataSource;
  readonly inputs: readonly TelemetrySampleInput[];
} = {
  source: syntheticTelemetrySource,
  inputs: [
    {
      timestamp: syntheticTimestamp(1000).original,
      values: { speed: 120, throttle: 100, brake: false, gear: 3 },
      origin: "synthetic",
    },
    {
      timestamp: syntheticTimestamp(0).original,
      values: { speed: 0, throttle: 0, brake: true, gear: 0 },
      origin: "synthetic",
    },
    {
      timestamp: syntheticTimestamp(1000).original,
      values: { speed: 125, throttle: 100, brake: false, gear: 3 },
      origin: "synthetic",
    },
    {
      timestamp: null,
      values: { speed: 130, throttle: 100, brake: false, gear: 3 },
      origin: "synthetic",
    },
    {
      timestamp: syntheticTimestamp(2000).original,
      values: { speed: Number.NaN, throttle: null, brake: false, gear: 4 },
      origin: "synthetic",
    },
  ],
};
const raceEntries = syntheticEntries(syntheticRaceSessionId);
export const syntheticComparisonRequest: TelemetryComparisonRequest = {
  sessionId: syntheticRaceSessionId,
  selections: [
    {
      entryId: raceEntries[0].id,
      lapId: createTelemetryLapId(raceEntries[0].id, 10),
    },
    {
      entryId: raceEntries[1].id,
      lapId: createTelemetryLapId(raceEntries[1].id, 10),
    },
  ],
  channels: ["speed", "throttle", "brake", "gear"],
  window: { fromMilliseconds: 0, toMilliseconds: 15000 },
  maxSamplesPerLap: 600,
  alignment: "lap-elapsed-time",
};

import type {
  IdentityMapping,
  LapTelemetry,
  Reading,
  RejectedSample,
  ReportedDuration,
  SourceTimestamp,
  TelemetryChannel,
  TelemetryComparison,
  TelemetrySample,
  TelemetryWarning,
  ValueOrigin,
} from "@/types/telemetry";
import { TELEMETRY_CHANNELS } from "@/types/telemetry";
import type { TelemetryWindow } from "@/types/telemetry-provider";
import {
  validateTelemetryEntryId,
  validateTelemetryLapId,
  validateTelemetrySessionId,
} from "@/types/telemetry-identifiers";

export const TELEMETRY_LIMITS = {
  selectedLaps: 2,
  windowMilliseconds: 600_000,
  displaySamplesPerLap: 600,
  combinedDisplaySamples: 1_200,
  serializedBytes: 512 * 1024,
  compressedTargetBytes: 150 * 1024,
  sourceBytesPerResponse: 2 * 1024 * 1024,
  sourceSamplesPerLap: 5_000,
  eventsPerSeason: 64,
  sessionsPerEvent: 16,
  entriesPerSession: 32,
  lapsPerEntry: 300,
  requestsPerOperation: 20,
  concurrentSourceRequests: 2,
  operationTimeoutMilliseconds: 15_000,
} as const;
function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function integer(value: unknown, min: number, max: number): value is number {
  return (
    finite(value) && Number.isSafeInteger(value) && value >= min && value <= max
  );
}
export type TelemetryOperation =
  "discover" | "entries" | "laps" | "telemetry" | "compare";
/** Structural validation before I/O; authoritative membership/mappings must also be resolved. */
export function validateTelemetryRequest(
  operation: TelemetryOperation,
  request: unknown,
): readonly string[] {
  if (!record(request)) return ["invalid-request"];
  const errors: string[] = [];
  const keys =
    operation === "discover"
      ? ["season"]
      : operation === "entries"
        ? ["sessionId"]
        : operation === "laps"
          ? ["sessionId", "entryId"]
          : [
              "sessionId",
              "channels",
              "window",
              "maxSamplesPerLap",
              "alignment",
              ...(operation === "compare"
                ? ["selections"]
                : ["entryId", "lapId"]),
            ];
  if (
    Object.keys(request).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(request, key))
  )
    errors.push("invalid-fields");
  if (operation === "discover") {
    if (!integer(request.season, 1950, 9999)) errors.push("invalid-season");
    return errors;
  }
  try {
    if (typeof request.sessionId !== "string" || request.sessionId.length > 80)
      throw new RangeError();
    const session = validateTelemetrySessionId(request.sessionId);
    if (operation === "laps" || operation === "telemetry") {
      const entry = validateTelemetryEntryId(request.entryId, session);
      if (operation === "telemetry")
        validateTelemetryLapId(request.lapId, entry);
    }
    if (operation === "compare") {
      if (!Array.isArray(request.selections) || request.selections.length !== 2)
        throw new RangeError();
      for (const selection of request.selections) {
        if (
          !record(selection) ||
          Object.keys(selection).length !== 2 ||
          !Object.hasOwn(selection, "entryId") ||
          !Object.hasOwn(selection, "lapId")
        )
          throw new RangeError();
        const entry = validateTelemetryEntryId(selection.entryId, session);
        validateTelemetryLapId(selection.lapId, entry);
      }
      if (request.selections[0].entryId === request.selections[1].entryId)
        errors.push("distinct-entries-required");
    }
  } catch {
    errors.push("invalid-identity");
  }
  if (operation === "entries" || operation === "laps") return errors;
  if (
    !Array.isArray(request.channels) ||
    request.channels.length < 1 ||
    request.channels.length > 4 ||
    new Set(request.channels).size !== request.channels.length ||
    Array.from(request.channels).some(
      (channel) => !TELEMETRY_CHANNELS.some((allowed) => allowed === channel),
    )
  )
    errors.push("invalid-channels");
  if (
    !record(request.window) ||
    Object.keys(request.window).length !== 2 ||
    !Object.hasOwn(request.window, "fromMilliseconds") ||
    !Object.hasOwn(request.window, "toMilliseconds") ||
    !finite(request.window.fromMilliseconds) ||
    !finite(request.window.toMilliseconds) ||
    request.window.fromMilliseconds < 0 ||
    request.window.toMilliseconds <= request.window.fromMilliseconds ||
    request.window.toMilliseconds > TELEMETRY_LIMITS.windowMilliseconds
  )
    errors.push("invalid-window");
  if (
    !integer(request.maxSamplesPerLap, 2, TELEMETRY_LIMITS.displaySamplesPerLap)
  )
    errors.push("invalid-sample-budget");
  if (request.alignment !== "lap-elapsed-time")
    errors.push("unsupported-alignment");
  return errors;
}
/** Real UTC calendar instants, up to nanosecond text precision; no Date fraction truncation. */
export function parseTelemetryTimestamp(
  value: unknown,
): SourceTimestamp | null {
  if (typeof value !== "string") return null;
  const match =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|\+00:00)$/.exec(
      value,
    );
  if (!match) return null;
  const milliseconds = Date.parse(match[1] + "Z");
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString().slice(0, 19) !== match[1]
  )
    return null;
  return { original: value, fractionalSecondDigits: match[2]?.length ?? 0 };
}
function nanoseconds(timestamp: SourceTimestamp): bigint {
  const checked = parseTelemetryTimestamp(timestamp.original);
  if (
    !checked ||
    checked.fractionalSecondDigits !== timestamp.fractionalSecondDigits
  )
    throw new RangeError("Invalid timestamp.");
  const fraction = /\.(\d+)/.exec(timestamp.original)?.[1] ?? "";
  return (
    BigInt(Date.parse(timestamp.original.slice(0, 19) + "Z")) *
      BigInt(1_000_000) +
    BigInt(fraction.padEnd(9, "0"))
  );
}
export function telemetryOffsetMilliseconds(
  at: SourceTimestamp,
  origin: SourceTimestamp,
): number {
  return Number(nanoseconds(at) - nanoseconds(origin)) / 1_000_000;
}
export function reportedSeconds(
  value: number,
  resolutionSeconds: number | null,
  origin: "reported" | "synthetic" = "reported",
): ReportedDuration {
  if (
    !finite(value) ||
    value < 0 ||
    !Number.isFinite(value * 1000) ||
    (resolutionSeconds !== null &&
      (!finite(resolutionSeconds) ||
        resolutionSeconds <= 0 ||
        !Number.isFinite(resolutionSeconds * 1000)))
  )
    throw new RangeError("Invalid duration.");
  return {
    milliseconds: value * 1000,
    sourceSeconds: value,
    resolutionMilliseconds:
      resolutionSeconds === null
        ? { status: "missing" }
        : { status: "available", value: resolutionSeconds * 1000 },
    origin,
  };
}
export function normalizeBrakeSignal(value: unknown): Reading<boolean> {
  if (value === null || value === undefined)
    return { status: "missing", reason: "source-missing" };
  if (value === false || value === 0)
    return { status: "available", value: false };
  if (value === true || value === 100)
    return { status: "available", value: true };
  return { status: "missing", reason: "invalid" };
}
export function normalizeNumericChannel(
  channel: Exclude<TelemetryChannel, "brake">,
  value: unknown,
): Reading<number> {
  if (value === null || value === undefined)
    return { status: "missing", reason: "source-missing" };
  if (
    !finite(value) ||
    value < 0 ||
    (channel === "throttle" && value > 100) ||
    (channel === "gear" && (!Number.isInteger(value) || value > 8))
  )
    return { status: "missing", reason: "invalid" };
  return { status: "available", value };
}
/** Provider-independent normalization input; never an application or wire payload. */
export interface TelemetrySampleInput {
  readonly timestamp: unknown;
  readonly values: {
    readonly speed: unknown;
    readonly throttle: unknown;
    readonly brake: unknown;
    readonly gear: unknown;
  };
  readonly origin: ValueOrigin;
}
export function normalizeTelemetrySamples(
  inputs: readonly TelemetrySampleInput[],
  start: SourceTimestamp | null,
  window: TelemetryWindow,
): {
  readonly samples: readonly TelemetrySample[];
  readonly rejectedSamples: readonly RejectedSample[];
  readonly warnings: readonly TelemetryWarning[];
} {
  if (inputs.length > TELEMETRY_LIMITS.sourceSamplesPerLap)
    throw new RangeError("Source sample budget exceeded.");
  if (
    !finite(window.fromMilliseconds) ||
    !finite(window.toMilliseconds) ||
    window.fromMilliseconds < 0 ||
    window.toMilliseconds <= window.fromMilliseconds ||
    window.toMilliseconds > TELEMETRY_LIMITS.windowMilliseconds
  )
    throw new RangeError("Invalid window.");
  const samples: TelemetrySample[] = [];
  const rejectedSamples: RejectedSample[] = [];
  const warnings = new Set<TelemetryWarning>();
  const seen = new Set<string>();
  let previous: bigint | null = null;
  inputs.forEach((input, sourceIndex) => {
    const timestamp = parseTelemetryTimestamp(input.timestamp);
    if (!timestamp) {
      rejectedSamples.push({
        sourceIndex,
        reason:
          input.timestamp === null || input.timestamp === undefined
            ? "missing-timestamp"
            : "invalid-timestamp",
      });
      return;
    }
    const instant = nanoseconds(timestamp);
    if (previous !== null && instant < previous) warnings.add("out-of-order");
    previous = instant;
    const key = instant.toString();
    if (seen.has(key)) {
      rejectedSamples.push({ sourceIndex, reason: "duplicate-timestamp" });
      warnings.add("duplicate-timestamp");
      return;
    }
    seen.add(key);
    const elapsedMilliseconds = start
      ? telemetryOffsetMilliseconds(timestamp, start)
      : null;
    if (
      elapsedMilliseconds !== null &&
      (elapsedMilliseconds < window.fromMilliseconds ||
        elapsedMilliseconds > window.toMilliseconds)
    ) {
      rejectedSamples.push({ sourceIndex, reason: "outside-window" });
      return;
    }
    const values = {
      speed: normalizeNumericChannel("speed", input.values.speed),
      throttle: normalizeNumericChannel("throttle", input.values.throttle),
      brake: normalizeBrakeSignal(input.values.brake),
      gear: normalizeNumericChannel("gear", input.values.gear),
    };
    for (const channel of TELEMETRY_CHANNELS) {
      const reading = values[channel];
      if (reading.status === "missing" && reading.reason === "invalid")
        rejectedSamples.push({ sourceIndex, reason: "invalid-value", channel });
    }
    samples.push({
      timestamp,
      elapsedMilliseconds,
      sourceIndex,
      origin: input.origin,
      values,
    });
  });
  samples.sort((a, b) => {
    const difference = nanoseconds(a.timestamp) - nanoseconds(b.timestamp);
    return difference < 0
      ? -1
      : difference > 0
        ? 1
        : a.sourceIndex - b.sourceIndex;
  });
  if (rejectedSamples.length) warnings.add("rejected-samples");
  return { samples, rejectedSamples, warnings: [...warnings] };
}
export function telemetryMappingIssue<C extends string, R>(
  mapping: IdentityMapping<C, R>,
): "mapping-ambiguous" | "mapping-unmapped" | null {
  return mapping.status === "verified"
    ? null
    : mapping.status === "ambiguous"
      ? "mapping-ambiguous"
      : "mapping-unmapped";
}
function validDuration(lap: LapTelemetry): boolean {
  return (
    lap.lap.validity !== "invalid" &&
    lap.lap.validity !== "deleted" &&
    lap.lap.duration.status === "available" &&
    finite(lap.lap.duration.value.milliseconds) &&
    lap.lap.duration.value.milliseconds > 0
  );
}
function boundaryIssue(
  lap: LapTelemetry,
): "missing-boundary" | "invalid-boundary" | null {
  const { start, end } = lap.lap;
  if (start.timestamp.status !== "available") return "missing-boundary";
  try {
    nanoseconds(start.timestamp.value);
  } catch {
    return "invalid-boundary";
  }
  if (start.method === "unknown") return "invalid-boundary";
  if (end.timestamp.status === "available") {
    try {
      if (
        telemetryOffsetMilliseconds(
          end.timestamp.value,
          start.timestamp.value,
        ) <= 0
      )
        return "invalid-boundary";
    } catch {
      return "invalid-boundary";
    }
  }
  return null;
}
function validIntervals(lap: LapTelemetry): readonly {
  readonly startMilliseconds: number;
  readonly endMilliseconds: number;
}[] {
  const offsets = lap.samples
    .filter((sample) =>
      Object.values(sample.values).some(
        (value) => value.status === "available",
      ),
    )
    .map((sample) => sample.elapsedMilliseconds)
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );
  if (offsets.length < 2) return [];
  let intervals = [
    {
      startMilliseconds: Math.min(...offsets),
      endMilliseconds: Math.max(...offsets),
    },
  ];
  for (const gap of lap.quality.missingIntervals) {
    intervals = intervals.flatMap((interval) => {
      if (
        gap.endMilliseconds <= interval.startMilliseconds ||
        gap.startMilliseconds >= interval.endMilliseconds
      )
        return [interval];
      const parts = [];
      if (gap.startMilliseconds > interval.startMilliseconds)
        parts.push({
          startMilliseconds: interval.startMilliseconds,
          endMilliseconds: gap.startMilliseconds,
        });
      if (gap.endMilliseconds < interval.endMilliseconds)
        parts.push({
          startMilliseconds: gap.endMilliseconds,
          endMilliseconds: interval.endMilliseconds,
        });
      return parts;
    });
  }
  // A declared gap boundary is not itself an observation. Do not extend a
  // supported interval to a timestamp where no retained sample exists.
  return intervals.flatMap((interval) => {
    const observed = offsets.filter(
      (offset) =>
        offset >= interval.startMilliseconds &&
        offset <= interval.endMilliseconds,
    );
    if (new Set(observed).size < 2) return [];
    return [
      {
        startMilliseconds: Math.min(...observed),
        endMilliseconds: Math.max(...observed),
      },
    ];
  });
}
export function compareTelemetryLaps(
  a: LapTelemetry,
  b: LapTelemetry,
): TelemetryComparison {
  if (a.lap.sessionId !== b.lap.sessionId || a.lap.entryId === b.lap.entryId)
    throw new RangeError(
      "Comparison requires distinct entries in the same session.",
    );
  const issue = boundaryIssue(a) ?? boundaryIssue(b);
  const intervals = [validIntervals(a), validIntervals(b)] as const;
  const degraded = [a, b].some(
    (lap) =>
      lap.lap.start.method === "source-approximate" ||
      lap.lap.start.uncertaintyMilliseconds.status !== "available" ||
      lap.lap.start.uncertaintyMilliseconds.value !== 0 ||
      lap.lap.end.timestamp.status !== "available" ||
      lap.quality.completeness !== "complete" ||
      lap.quality.boundaryCoverage !== "complete" ||
      lap.quality.timestampUncertaintyMilliseconds.status !== "available" ||
      lap.quality.timestampUncertaintyMilliseconds.value !== 0,
  );
  return {
    sessionId: a.lap.sessionId,
    laps: [a, b],
    lapDifferenceMilliseconds:
      validDuration(a) &&
      validDuration(b) &&
      a.lap.duration.status === "available" &&
      b.lap.duration.status === "available"
        ? {
            status: "available",
            value:
              b.lap.duration.value.milliseconds -
              a.lap.duration.value.milliseconds,
          }
        : { status: "missing", reason: "invalid" },
    alignment: issue
      ? { status: "unavailable", method: "none", reason: issue }
      : intervals.some((interval) => interval.length === 0)
        ? {
            status: "unavailable",
            method: "none",
            reason: "insufficient-coverage",
          }
        : {
            status: degraded ? "degraded" : "available",
            method: "lap-elapsed-time",
            equalTrackPosition: false,
            origins: [a.lap.start, b.lap.start],
            validIntervals: intervals,
          },
    continuousDistanceDelta: {
      status: "unavailable",
      reason: "validated-distance-alignment-required",
    },
  };
}
/** Exact UTF-8 JSON size; rejects cycles, non-finite numbers and non-JSON values. */
export function telemetrySerializedBytes(value: unknown): number {
  const visited = new Set<object>();
  function valid(item: unknown): boolean {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return true;
    if (typeof item === "number") return Number.isFinite(item);
    if (typeof item !== "object" || visited.has(item)) return false;
    if (
      !Array.isArray(item) &&
      Object.getPrototypeOf(item) !== Object.prototype
    )
      return false;
    if (Array.isArray(item)) {
      if (Object.keys(item).length !== item.length) return false;
      for (let index = 0; index < item.length; index++) {
        if (!Object.hasOwn(item, index)) return false;
      }
    }
    visited.add(item);
    const result = Object.values(item).every(valid);
    visited.delete(item);
    return result;
  }
  if (!valid(value)) return Infinity;
  const json = JSON.stringify(value);
  let bytes = 0;
  for (const point of json) {
    const code = point.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}
export function enforceTelemetryPayloadBudget(value: unknown): boolean {
  return telemetrySerializedBytes(value) <= TELEMETRY_LIMITS.serializedBytes;
}

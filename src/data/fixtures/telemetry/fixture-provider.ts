/** Explicitly constructed development/test provider. No network, runtime mode or production fallback. */
import type { SessionId } from "@/types/f1";
import type { DataError, ResponseMetadata } from "@/types/f1-provider";
import {
  TELEMETRY_CHANNELS,
  TELEMETRY_CONTRACT_VERSION,
} from "@/types/telemetry";
import type {
  LapTelemetry,
  TelemetryComparison,
  TelemetryEntry,
  TelemetryEvent,
  TelemetryLap,
  TelemetryWarning,
} from "@/types/telemetry";
import type {
  TelemetryDisplayRequest,
  TelemetryProvider,
  TelemetryResult,
  TelemetrySelection,
  TelemetryUnavailableReason,
} from "@/types/telemetry-provider";
import {
  compareTelemetryLaps,
  enforceTelemetryPayloadBudget,
  normalizeTelemetrySamples,
  TELEMETRY_LIMITS,
  validateTelemetryRequest,
} from "@/types/telemetry-validation";
import type { TelemetryOperation } from "@/types/telemetry-validation";
import {
  available,
  syntheticComparisonRequest,
  syntheticEntries,
  syntheticEvent,
  syntheticInvalidBoundaryLap,
  syntheticLap,
  syntheticLapTelemetry,
  syntheticMappingEvidence,
  syntheticMissingBoundaryLap,
  syntheticTelemetryMetadata,
  syntheticTelemetrySource,
  SYNTHETIC_TELEMETRY_SEASON,
} from "./fixtures";

export type SyntheticTelemetryScenario =
  | "complete"
  | "gaps"
  | "partial-channels"
  | "duplicate-timestamps"
  | "missing-boundary"
  | "invalid-boundary"
  | "ambiguous-driver"
  | "ambiguous-session"
  | "unmapped-driver"
  | "timeout"
  | "rate-limited"
  | "upstream-error"
  | "empty";
const errorMessages: Partial<Record<DataError["code"], string>> = {
  "invalid-request": "The telemetry selection is invalid.",
  timeout: "The synthetic upstream timed out.",
  "rate-limited": "The synthetic upstream request limit was reached.",
  "temporarily-unavailable": "The synthetic upstream is unavailable.",
};

export function createSyntheticTelemetryProvider(
  scenario: SyntheticTelemetryScenario = "complete",
): TelemetryProvider {
  function failure<T>(code: DataError["code"]): TelemetryResult<T> {
    return {
      version: TELEMETRY_CONTRACT_VERSION,
      status: "error",
      error: {
        code,
        message: errorMessages[code] ?? "The synthetic request failed.",
        retryable: code !== "invalid-request",
        ...(code === "rate-limited" ? { retryAt: "2024-03-03T00:01:00Z" } : {}),
      },
      metadata: {
        source: syntheticTelemetrySource,
        attemptedAt: "2024-03-03T00:00:00Z",
      },
    };
  }
  function unavailable<T>(
    reason: TelemetryUnavailableReason,
  ): TelemetryResult<T> {
    return {
      version: TELEMETRY_CONTRACT_VERSION,
      status: "unavailable",
      reason,
      metadata: { ...syntheticTelemetryMetadata, completeness: "unknown" },
    };
  }
  function empty<T>(): TelemetryResult<T> {
    return {
      version: TELEMETRY_CONTRACT_VERSION,
      status: "empty",
      reason: "no-entries",
      metadata: syntheticTelemetryMetadata,
    };
  }
  function success<T>(data: T, partial = false): TelemetryResult<T> {
    const metadata: ResponseMetadata = {
      ...syntheticTelemetryMetadata,
      completeness: partial ? "partial" : "complete",
    };
    const envelope: TelemetryResult<T> = {
      version: TELEMETRY_CONTRACT_VERSION,
      status: "success",
      data,
      metadata,
    };
    return enforceTelemetryPayloadBudget(envelope)
      ? envelope
      : unavailable("budget-exceeded");
  }
  function preflight<T>(
    operation: TelemetryOperation,
    request: unknown,
  ): TelemetryResult<T> | undefined {
    if (validateTelemetryRequest(operation, request).length)
      return failure("invalid-request");
    if (scenario === "timeout") return failure("timeout");
    if (scenario === "rate-limited") return failure("rate-limited");
    if (scenario === "upstream-error")
      return failure("temporarily-unavailable");
    return undefined;
  }
  function sessionIssue<T>(
    sessionId: SessionId,
  ): TelemetryResult<T> | undefined {
    const season = Number(sessionId.split(":")[1]);
    if (season < 2023) return unavailable("before-coverage");
    if (!syntheticEvent.sessions.some((session) => session.id === sessionId))
      return unavailable("unknown-session");
    if (scenario === "ambiguous-session")
      return unavailable("mapping-ambiguous");
    return undefined;
  }
  function entriesFor(sessionId: SessionId): readonly TelemetryEntry[] {
    const entries = syntheticEntries(sessionId);
    if (scenario === "ambiguous-driver")
      return entries.map((entry) => ({
        ...entry,
        mapping: {
          status: "ambiguous",
          candidates: entries.map((candidate) => candidate.driver.id),
          reference: entry.mapping.reference,
          provenance: syntheticMappingEvidence,
        },
      }));
    if (scenario === "unmapped-driver")
      return entries.map((entry) => ({
        ...entry,
        mapping: {
          status: "unmapped",
          reference: entry.mapping.reference,
          provenance: syntheticMappingEvidence,
        },
      }));
    return entries;
  }
  function entryIssue<T>(
    entry: TelemetryEntry | undefined,
  ): TelemetryResult<T> | undefined {
    if (!entry) return unavailable("unknown-entry");
    if (entry.mapping.status === "ambiguous")
      return unavailable("mapping-ambiguous");
    if (entry.mapping.status === "unmapped")
      return unavailable("mapping-unmapped");
    return undefined;
  }
  function eventForScenario(): TelemetryEvent {
    if (scenario !== "ambiguous-session") return syntheticEvent;
    return {
      ...syntheticEvent,
      sessions: syntheticEvent.sessions.map((session) => ({
        ...session,
        mapping: {
          status: "ambiguous",
          candidates: syntheticEvent.sessions.map((candidate) => candidate.id),
          reference: session.mapping.reference,
          provenance: syntheticMappingEvidence,
        },
      })),
    };
  }
  function seriesFor(entry: TelemetryEntry, lapNumber: number): LapTelemetry {
    const series = syntheticLapTelemetry(entry, lapNumber);
    if (scenario === "missing-boundary")
      return {
        ...series,
        lap: { ...series.lap, start: syntheticMissingBoundaryLap.lap.start },
        samples: series.samples.map((sample) => ({
          ...sample,
          elapsedMilliseconds: null,
        })),
        quality: {
          ...series.quality,
          completeness: "partial",
          boundaryCoverage: "partial",
          timestampUncertaintyMilliseconds: { status: "missing" },
          warnings: ["partial-boundary", "timestamp-uncertainty"],
          coverageFraction: { status: "missing" },
          coverageMethod: "unknown",
        },
      };
    if (scenario === "invalid-boundary")
      return {
        ...series,
        lap: { ...series.lap, end: syntheticInvalidBoundaryLap.lap.end },
        quality: {
          ...series.quality,
          completeness: "partial",
          boundaryCoverage: "partial",
          timestampUncertaintyMilliseconds: { status: "missing" },
          warnings: ["partial-boundary", "timestamp-uncertainty"],
          coverageFraction: { status: "missing" },
          coverageMethod: "unknown",
        },
      };
    if (scenario === "gaps") {
      const samples = series.samples.filter(
        (sample) => sample.sourceIndex < 4 || sample.sourceIndex > 6,
      );
      const cadence = series.quality.observedCadenceMilliseconds;
      const step = cadence.status === "available" ? cadence.value : 0;
      return {
        ...series,
        lap: {
          ...series.lap,
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
        samples,
        quality: {
          ...series.quality,
          completeness: "partial",
          missingIntervals: [
            {
              startMilliseconds: step * 3,
              endMilliseconds: step * 7,
              channels: [...TELEMETRY_CHANNELS],
              reason: "not-recorded",
            },
          ],
          warnings: ["missing-interval"],
          maximumGapMilliseconds: available(step * 4),
          coverageFraction: { status: "missing" },
          coverageMethod: "unknown",
        },
        reduction: {
          ...series.reduction,
          inputCount: samples.length,
          outputCount: samples.length,
        },
      };
    }
    if (scenario === "partial-channels")
      return {
        ...series,
        lap: {
          ...series.lap,
          coverage: {
            status: "partial",
            channels: { ...series.lap.coverage.channels, gear: "unavailable" },
          },
        },
        samples: series.samples.map((sample) => ({
          ...sample,
          values: {
            ...sample.values,
            gear: { status: "missing", reason: "not-supported" },
          },
        })),
        quality: {
          ...series.quality,
          completeness: "partial",
          warnings: ["unavailable-channel"],
          coverageFraction: { status: "missing" },
          coverageMethod: "unknown",
        },
      };
    if (scenario === "duplicate-timestamps") {
      const first = series.samples[0];
      const second = series.samples[1];
      if (
        !first ||
        !second ||
        series.lap.start.timestamp.status !== "available"
      )
        return series;
      const input = (sample: typeof first) => ({
        timestamp: sample.timestamp.original,
        values: {
          speed:
            sample.values.speed.status === "available"
              ? sample.values.speed.value
              : null,
          throttle: 100,
          brake: false,
          gear: 3,
        },
        origin: "synthetic" as const,
      });
      const normalized = normalizeTelemetrySamples(
        [
          input(second),
          input(first),
          input(second),
          ...series.samples.slice(2).map(input),
        ],
        series.lap.start.timestamp.value,
        { fromMilliseconds: 0, toMilliseconds: 15000 },
      );
      return {
        ...series,
        samples: normalized.samples,
        quality: {
          ...series.quality,
          completeness: "partial",
          rejectedSamples: normalized.rejectedSamples,
          warnings: normalized.warnings,
        },
        reduction: {
          ...series.reduction,
          inputCount: series.samples.length + 1,
          outputCount: normalized.samples.length,
        },
      };
    }
    return series;
  }
  function project(
    series: LapTelemetry,
    request: TelemetryDisplayRequest,
  ): LapTelemetry {
    const samples = series.samples
      .filter(
        (sample) =>
          sample.elapsedMilliseconds !== null &&
          sample.elapsedMilliseconds >= request.window.fromMilliseconds &&
          sample.elapsedMilliseconds <= request.window.toMilliseconds,
      )
      .map((sample) => ({
        ...sample,
        values: {
          speed: request.channels.includes("speed")
            ? sample.values.speed
            : { status: "missing" as const, reason: "not-requested" as const },
          throttle: request.channels.includes("throttle")
            ? sample.values.throttle
            : { status: "missing" as const, reason: "not-requested" as const },
          brake: request.channels.includes("brake")
            ? sample.values.brake
            : { status: "missing" as const, reason: "not-requested" as const },
          gear: request.channels.includes("gear")
            ? sample.values.gear
            : { status: "missing" as const, reason: "not-requested" as const },
        },
      }));
    const duration =
      series.lap.duration.status === "available"
        ? series.lap.duration.value.milliseconds
        : null;
    const narrowed =
      request.window.fromMilliseconds > 0 ||
      duration === null ||
      request.window.toMilliseconds < duration;
    const projected = request.channels.length < TELEMETRY_CHANNELS.length;
    const missingIntervals = series.quality.missingIntervals
      .map((gap) => ({
        ...gap,
        startMilliseconds: Math.max(
          gap.startMilliseconds,
          request.window.fromMilliseconds,
        ),
        endMilliseconds: Math.min(
          gap.endMilliseconds,
          request.window.toMilliseconds,
        ),
        channels: gap.channels.filter((channel) =>
          request.channels.includes(channel),
        ),
      }))
      .filter(
        (gap) =>
          gap.channels.length && gap.endMilliseconds > gap.startMilliseconds,
      );
    const warnings: TelemetryWarning[] = series.quality.warnings.filter(
      (warning) =>
        (warning !== "missing-interval" || missingIntervals.length > 0) &&
        (warning !== "unavailable-channel" ||
          request.channels.some(
            (channel) =>
              series.lap.coverage.channels[channel] === "unavailable",
          )),
    );
    if (narrowed && !warnings.includes("partial-boundary"))
      warnings.push("partial-boundary");
    const offsets = samples
      .map((sample) => sample.elapsedMilliseconds)
      .filter((value): value is number => value !== null);
    const gaps = offsets
      .slice(1)
      .map((offset, index) => offset - (offsets[index] ?? offset));
    return {
      ...series,
      samples,
      quality: {
        ...series.quality,
        completeness:
          narrowed || projected ? "partial" : series.quality.completeness,
        boundaryCoverage: narrowed
          ? "partial"
          : series.quality.boundaryCoverage,
        missingIntervals,
        warnings,
        coverageFraction:
          narrowed || projected
            ? { status: "missing" }
            : series.quality.coverageFraction,
        coverageMethod:
          narrowed || projected ? "unknown" : series.quality.coverageMethod,
        maximumGapMilliseconds: gaps.length
          ? available(Math.max(...gaps))
          : { status: "missing" },
      },
      reduction: {
        ...series.reduction,
        inputCount: narrowed ? samples.length : series.reduction.inputCount,
        outputCount: samples.length,
        budget: request.maxSamplesPerLap,
      },
    };
  }
  type ResolvedSelection = {
    readonly entry: TelemetryEntry;
    readonly lapNumber: number;
  };
  function resolveSelection(
    request: TelemetryDisplayRequest,
    selection: TelemetrySelection,
  ): ResolvedSelection | TelemetryResult<never> {
    const entry = entriesFor(request.sessionId).find(
      (candidate) => candidate.id === selection.entryId,
    );
    const issue = entryIssue<never>(entry);
    if (issue) return issue;
    if (!entry) return unavailable("unknown-entry");
    const lap = [10, 11]
      .map((number) => syntheticLap(entry, number))
      .find((candidate) => candidate.id === selection.lapId);
    if (!lap) return unavailable("unknown-lap");
    return { entry, lapNumber: lap.lapNumber };
  }
  function selected(
    request: TelemetryDisplayRequest,
    selection: ResolvedSelection,
  ): LapTelemetry | TelemetryResult<never> {
    if (scenario === "missing-boundary") return unavailable("missing-boundary");
    const projected = project(
      seriesFor(selection.entry, selection.lapNumber),
      request,
    );
    if (projected.samples.length > request.maxSamplesPerLap)
      return unavailable("budget-exceeded");
    return projected;
  }
  function isOutcome(
    value: LapTelemetry | ResolvedSelection | TelemetryResult<never>,
  ): value is TelemetryResult<never> {
    return "status" in value;
  }
  return {
    async discover(request) {
      const failed = preflight<readonly TelemetryEvent[]>("discover", request);
      if (failed) return failed;
      if (request.season < 2023) return unavailable("before-coverage");
      if (request.season !== SYNTHETIC_TELEMETRY_SEASON)
        return unavailable("not-covered");
      if (scenario === "empty") return empty();
      return success([eventForScenario()], scenario === "ambiguous-session");
    },
    async getEntries(request) {
      const failed =
        preflight<readonly TelemetryEntry[]>("entries", request) ??
        sessionIssue<readonly TelemetryEntry[]>(request.sessionId);
      if (failed) return failed;
      if (scenario === "empty") return empty();
      return success(
        entriesFor(request.sessionId),
        scenario === "ambiguous-driver" || scenario === "unmapped-driver",
      );
    },
    async getLaps(request) {
      const failed =
        preflight<readonly TelemetryLap[]>("laps", request) ??
        sessionIssue<readonly TelemetryLap[]>(request.sessionId);
      if (failed) return failed;
      const entry = entriesFor(request.sessionId).find(
        (candidate) => candidate.id === request.entryId,
      );
      const issue = entryIssue<readonly TelemetryLap[]>(entry);
      if (issue) return issue;
      if (!entry) return unavailable("unknown-entry");
      if (scenario === "empty") return empty();
      const laps = [10, 11].map((number) => seriesFor(entry, number).lap);
      return success(
        laps,
        laps.some(
          (lap) =>
            lap.coverage.status !== "available" ||
            lap.start.timestamp.status !== "available",
        ) || scenario === "invalid-boundary",
      );
    },
    async getLapTelemetry(request) {
      const failed =
        preflight<LapTelemetry>("telemetry", request) ??
        sessionIssue<LapTelemetry>(request.sessionId);
      if (failed) return failed;
      const resolution = resolveSelection(request, request);
      if (isOutcome(resolution)) return resolution;
      if (scenario === "empty") return empty();
      const value = selected(request, resolution);
      if (isOutcome(value)) return value;
      if (!value.samples.length) return empty();
      return success(value, value.quality.completeness !== "complete");
    },
    async compare(request) {
      const failed =
        preflight<TelemetryComparison>("compare", request) ??
        sessionIssue<TelemetryComparison>(request.sessionId);
      if (failed) return failed;
      const resolutionA = resolveSelection(request, request.selections[0]);
      if (isOutcome(resolutionA)) return resolutionA;
      const resolutionB = resolveSelection(request, request.selections[1]);
      if (isOutcome(resolutionB)) return resolutionB;
      if (scenario === "empty") return empty();
      const a = selected(request, resolutionA);
      if (isOutcome(a)) return a;
      const b = selected(request, resolutionB);
      if (isOutcome(b)) return b;
      if (
        a.samples.length + b.samples.length >
        TELEMETRY_LIMITS.combinedDisplaySamples
      )
        return unavailable("budget-exceeded");
      const comparison = compareTelemetryLaps(a, b);
      return success(
        comparison,
        a.quality.completeness !== "complete" ||
          b.quality.completeness !== "complete",
      );
    },
  };
}
/** Named default request remains separate from provider construction. */
export { syntheticComparisonRequest };

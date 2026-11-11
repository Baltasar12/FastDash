import type { SessionId } from "@/types/f1";
import type {
  DataError,
  FailureMetadata,
  ResponseMetadata,
} from "@/types/f1-provider";
import type {
  LapTelemetry,
  TelemetryChannel,
  TelemetryComparison,
  TelemetryEntry,
  TelemetryEntryId,
  TelemetryEvent,
  TelemetryLap,
  TelemetryLapId,
} from "@/types/telemetry";

export type TelemetryUnavailableReason =
  | "before-coverage"
  | "unknown-event"
  | "unknown-session"
  | "unknown-entry"
  | "unknown-lap"
  | "not-covered"
  | "not-published"
  | "cancelled"
  | "mapping-ambiguous"
  | "mapping-unmapped"
  | "missing-boundary"
  | "budget-exceeded";
export type TelemetryResult<T> =
  | {
      readonly version: 1;
      readonly status: "success";
      readonly data: T;
      readonly metadata: ResponseMetadata;
    }
  | {
      readonly version: 1;
      readonly status: "empty";
      readonly reason: "no-entries";
      readonly metadata: ResponseMetadata;
    }
  | {
      readonly version: 1;
      readonly status: "unavailable";
      readonly reason: TelemetryUnavailableReason;
      readonly metadata: ResponseMetadata;
    }
  | {
      readonly version: 1;
      readonly status: "error";
      readonly error: DataError;
      readonly metadata: FailureMetadata;
    };
export type TelemetryState<T> =
  { readonly status: "loading" } | TelemetryResult<T>;

/** One explicit season, no all-history or live/latest selector. */
export interface TelemetryDiscoveryRequest {
  readonly season: number;
}
export interface TelemetrySessionRequest {
  readonly sessionId: SessionId;
}
export interface TelemetryLapsRequest extends TelemetrySessionRequest {
  readonly entryId: TelemetryEntryId;
}
export interface TelemetrySelection {
  readonly entryId: TelemetryEntryId;
  readonly lapId: TelemetryLapId;
}
export interface TelemetryWindow {
  /** Elapsed milliseconds, inclusive boundaries; requires evidenced lap origin. */
  readonly fromMilliseconds: number;
  readonly toMilliseconds: number;
}
export interface TelemetryDisplayRequest extends TelemetrySessionRequest {
  readonly channels: readonly TelemetryChannel[];
  readonly window: TelemetryWindow;
  readonly maxSamplesPerLap: number;
  readonly alignment: "lap-elapsed-time";
}
export interface LapTelemetryRequest
  extends TelemetryDisplayRequest, TelemetrySelection {}
export interface TelemetryComparisonRequest extends TelemetryDisplayRequest {
  readonly selections: readonly [TelemetrySelection, TelemetrySelection];
}

/**
 * Expected failures resolve as discriminated values. Validate before upstream I/O.
 * Collections are complete within one season/session/entry or explicitly partial.
 * Concrete HTTP adapters are server-only; this capability contains no transport.
 */
export interface TelemetryProvider {
  discover(
    request: TelemetryDiscoveryRequest,
  ): Promise<TelemetryResult<readonly TelemetryEvent[]>>;
  getEntries(
    request: TelemetrySessionRequest,
  ): Promise<TelemetryResult<readonly TelemetryEntry[]>>;
  getLaps(
    request: TelemetryLapsRequest,
  ): Promise<TelemetryResult<readonly TelemetryLap[]>>;
  getLapTelemetry(
    request: LapTelemetryRequest,
  ): Promise<TelemetryResult<LapTelemetry>>;
  compare(
    request: TelemetryComparisonRequest,
  ): Promise<TelemetryResult<TelemetryComparison>>;
}

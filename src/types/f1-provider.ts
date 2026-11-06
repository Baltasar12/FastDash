import type {
  ConstructorStanding,
  DriverStanding,
  GrandPrix,
  QualifyingResult,
  RaceResult,
  Season,
  SeasonYear,
  UTCDateTime,
} from "@/types/f1";

export interface DataSource {
  readonly id: string;
  readonly name: string;
  readonly kind: "external" | "synthetic";
  /** Public, vetted reference only; no credentials, raw URLs or upstream errors. */
  readonly reference?: string;
  readonly attribution: readonly string[];
}

export interface DataError {
  readonly code:
    | "invalid-request"
    | "network"
    | "timeout"
    | "rate-limited"
    | "invalid-response"
    | "temporarily-unavailable"
    | "cancelled";
  /** Application-owned safe copy; never the raw exception or response body. */
  readonly message: string;
  readonly retryable: boolean;
  /** UTC Retry-After instant when known; do not invent one otherwise. */
  readonly retryAt?: UTCDateTime;
}

export interface ResponseMetadata {
  readonly source: DataSource;
  /** When this dataset was retrieved, not the latest unsuccessful refresh. */
  readonly retrievedAt: UTCDateTime;
  /** Include only if genuinely supplied by the source, never copied from retrieval. */
  readonly sourceUpdatedAt?: UTCDateTime;
  readonly freshness: "fresh" | "stale";
  readonly cache: "hit" | "miss" | "bypass";
  readonly expiresAt?: UTCDateTime;
  readonly finality: "provisional" | "final" | "unknown";
  readonly completeness: "complete" | "partial" | "unknown";
  /** A stale response can retain real data after a failed refresh explicitly. */
  readonly revalidationError?: DataError;
}

export interface FailureMetadata {
  readonly source: DataSource;
  readonly attemptedAt: UTCDateTime;
}

/** Expected provider outcomes resolve as values; programmer errors may still throw. */
export type DataResult<T> =
  | {
      readonly status: "success";
      readonly data: T;
      readonly metadata: ResponseMetadata;
    }
  | {
      /** Confirmed valid dataset with no entries, never unpublished results. */
      readonly status: "empty";
      readonly reason: "no-entries";
      readonly metadata: ResponseMetadata;
    }
  | {
      readonly status: "unavailable";
      readonly reason:
        | "unknown-season"
        | "unknown-event"
        | "not-published"
        | "not-covered"
        | "cancelled";
      readonly metadata: ResponseMetadata;
    }
  | {
      readonly status: "error";
      readonly error: DataError;
      readonly metadata: FailureMetadata;
    };

/** Loading belongs to the consumer; providers never return a loading outcome. */
export type DataState<T> = { readonly status: "loading" } | DataResult<T>;

export interface SeasonRequest {
  readonly season: SeasonYear;
}

export interface EventRequest extends SeasonRequest {
  readonly round: number;
}

/**
 * Provider implementations aggregate pagination before resolving a full dataset.
 * Interface/type imports are safe for consumers; concrete adapters are server-only.
 * Race results mean the main race, qualifying means main-race qualifying.
 * Sprint results require a separately approved operation, never silent substitution.
 */
export interface F1DataProvider {
  getSupportedSeasons(): Promise<DataResult<readonly Season[]>>;
  getSeasonCalendar(
    request: SeasonRequest,
  ): Promise<DataResult<readonly GrandPrix[]>>;
  getDriverStandings(
    request: SeasonRequest,
  ): Promise<DataResult<readonly DriverStanding[]>>;
  getConstructorStandings(
    request: SeasonRequest,
  ): Promise<DataResult<readonly ConstructorStanding[]>>;
  getEventDetails(request: EventRequest): Promise<DataResult<GrandPrix>>;
  getRaceResults(
    request: EventRequest,
  ): Promise<DataResult<readonly RaceResult[]>>;
  getQualifyingResults(
    request: EventRequest,
  ): Promise<DataResult<readonly QualifyingResult[]>>;
}

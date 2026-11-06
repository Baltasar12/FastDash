import type { RaceResult } from "@/types/f1";
import type {
  DataError,
  DataResult,
  DataSource,
  ResponseMetadata,
} from "@/types/f1-provider";
import { FIXTURE_LABEL, sampleRaceResults } from "./f1";

export const sampleSource: DataSource = {
  id: "sector-synthetic-fixtures-v1",
  name: FIXTURE_LABEL,
  kind: "synthetic",
  attribution: ["SECTOR synthetic fixtures; no real championship data"],
};

export const sampleMetadata: ResponseMetadata = {
  source: sampleSource,
  retrievedAt: "2099-05-01T12:00:00Z",
  freshness: "fresh",
  cache: "bypass",
  finality: "final",
  completeness: "complete",
};

export const sampleErrors = {
  "invalid-request": {
    code: "invalid-request",
    message: "Invalid season or round.",
    retryable: false,
  },
  network: {
    code: "network",
    message: "Sample connection failure.",
    retryable: true,
  },
  timeout: {
    code: "timeout",
    message: "Sample request timed out.",
    retryable: true,
  },
  "rate-limited": {
    code: "rate-limited",
    message: "Sample request limit reached.",
    retryable: true,
    retryAt: "2099-05-01T12:01:00Z",
  },
  "invalid-response": {
    code: "invalid-response",
    message: "Sample response failed validation.",
    retryable: false,
  },
  "temporarily-unavailable": {
    code: "temporarily-unavailable",
    message: "Sample provider is temporarily unavailable.",
    retryable: true,
  },
  cancelled: {
    code: "cancelled",
    message: "Sample request was cancelled.",
    retryable: false,
  },
} satisfies Record<DataError["code"], DataError>;

export const sampleEmptyResult: DataResult<readonly RaceResult[]> = {
  status: "empty",
  reason: "no-entries",
  metadata: sampleMetadata,
};

export const sampleUnpublishedResult: DataResult<readonly RaceResult[]> = {
  status: "unavailable",
  reason: "not-published",
  metadata: { ...sampleMetadata, finality: "unknown", completeness: "unknown" },
};

export const samplePartialResult: DataResult<readonly RaceResult[]> = {
  status: "success",
  data: sampleRaceResults,
  metadata: {
    ...sampleMetadata,
    finality: "provisional",
    completeness: "partial",
  },
};

export const sampleStaleResult: DataResult<readonly RaceResult[]> = {
  status: "success",
  data: sampleRaceResults,
  metadata: {
    ...sampleMetadata,
    freshness: "stale",
    cache: "hit",
    expiresAt: "2099-05-01T12:00:30Z",
    revalidationError: sampleErrors.network,
  },
};

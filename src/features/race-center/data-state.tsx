import { cn } from "@/lib/utils";
import type { DataResult } from "@/types/f1-provider";
import type { RaceCenterSelection } from "./types";
import styles from "./race-center.module.css";

export function DatasetMetadata({
  result,
  label,
}: {
  result: DataResult<unknown>;
  label: string;
}) {
  const { metadata } = result;
  const { source } = metadata;
  return (
    <div className={styles.metadata} aria-label={`${label} data provenance`}>
      <p>
        {source.kind === "synthetic" && (
          <strong className={cn(styles.badge, styles.sampleBadge)}>
            Synthetic sample — invented data
          </strong>
        )}{" "}
        {"freshness" in metadata && (
          <>
            <span className={styles.badge}>
              {metadata.freshness === "stale" ? "Stale data" : "Fresh snapshot"}
            </span>{" "}
            <span className={styles.badge}>
              {metadata.finality === "final"
                ? "Final"
                : metadata.finality === "provisional"
                  ? "Provisional"
                  : "Finality unknown"}
            </span>{" "}
            <span className={styles.badge}>
              {metadata.completeness === "partial"
                ? "Partial dataset"
                : metadata.completeness === "unknown"
                  ? "Completeness unknown"
                  : "Complete dataset"}
            </span>
          </>
        )}
      </p>
      {"freshness" in metadata && metadata.freshness === "stale" && (
        <p className={styles.warning}>
          Showing an older snapshot. Last successful retrieval:{" "}
          <time dateTime={metadata.retrievedAt}>{metadata.retrievedAt}</time>.
          {metadata.revalidationError && " The latest refresh failed."}
        </p>
      )}
      {"completeness" in metadata && metadata.completeness === "partial" && (
        <p className={styles.warning}>
          Some records are missing. This dataset is incomplete.
        </p>
      )}
      <details className={styles.details}>
        <summary className={styles.detailsSummary}>
          {label}: source &amp; retrieval details
        </summary>
        <div className={styles.detailsBody}>
          <p>Source: {source.name}</p>
          {source.attribution.map((credit) => (
            <p key={credit}>{credit}</p>
          ))}
          {"retrievedAt" in metadata ? (
            <>
              <p>
                Retrieved:{" "}
                <time dateTime={metadata.retrievedAt}>
                  {metadata.retrievedAt}
                </time>
                . This is a snapshot, not live timing.
              </p>
              {metadata.sourceUpdatedAt && (
                <p>
                  Source updated:{" "}
                  <time dateTime={metadata.sourceUpdatedAt}>
                    {metadata.sourceUpdatedAt}
                  </time>
                </p>
              )}
              <p>Cache: {metadata.cache}</p>
            </>
          ) : (
            <p>
              Attempted:{" "}
              <time dateTime={metadata.attemptedAt}>
                {metadata.attemptedAt}
              </time>
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

const UNAVAILABLE_COPY = {
  "unknown-season": "This season is unknown to the data provider.",
  "unknown-event": "This event is unknown to the data provider.",
  "not-published":
    "This dataset has not been published. Check again after publication.",
  "not-covered": "The provider does not cover this dataset.",
  cancelled: "This session was cancelled. Results are unavailable.",
};

export function DataMessage({
  result,
  label,
  selection,
}: {
  result: Exclude<DataResult<unknown>, { status: "success" }>;
  label: string;
  selection?: RaceCenterSelection;
}) {
  const recovery =
    label === "Season list"
      ? "Season selection will be available when the provider supplies season records. Check again when coverage is available."
      : label === "Calendar"
        ? "Choose another season using the season controls above."
        : label === "Event overview"
          ? "Choose another Grand Prix using the event controls above."
          : "Choose another event or reported session.";
  return (
    <div
      className={cn(
        styles.emptyState,
        result.status === "error" && styles.errorState,
      )}
    >
      <p className={styles.eyebrow}>
        {result.status === "error" ? "Request failed" : "Data availability"}
      </p>
      <h3 className={styles.stateTitle}>
        {label}{" "}
        {result.status === "empty"
          ? "has no entries"
          : result.status === "error"
            ? "could not be loaded"
            : "unavailable"}
      </h3>
      <p className={styles.stateCopy}>
        {result.status === "empty"
          ? `The provider confirmed there are no matching records. ${recovery}`
          : result.status === "unavailable"
            ? `${UNAVAILABLE_COPY[result.reason]} ${recovery}`
            : result.error.message}
      </p>
      {result.status === "error" && (
        <p className={styles.stateCopy}>
          {result.error.retryable
            ? "Retry the data request when the provider is available."
            : `${recovery} This request cannot currently be retried.`}
          {result.error.retryAt && (
            <>
              {" "}
              Retry after{" "}
              <time dateTime={result.error.retryAt}>
                {result.error.retryAt}
              </time>{" "}
              (UTC).
            </>
          )}
        </p>
      )}
      {result.status === "error" && result.error.retryable && (
        <form method="get" className={styles.selectorForm}>
          {selection?.season !== undefined && (
            <input type="hidden" name="season" value={selection.season} />
          )}
          {selection?.round !== undefined && (
            <input type="hidden" name="round" value={selection.round} />
          )}
          {selection?.session !== undefined && (
            <input type="hidden" name="session" value={selection.session} />
          )}
          <button type="submit" className={styles.action}>
            Retry data request
          </button>
        </form>
      )}
    </div>
  );
}

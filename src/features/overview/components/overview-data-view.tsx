import type { DataState } from "@/types/f1-provider";
import { instantText } from "../formatters";
import styles from "../overview.module.css";

export function Provenance({ state }: { state: DataState<unknown> }) {
  if (state.status === "loading") return null;
  const metadata = state.metadata;
  return (
    <div className={styles.provenance}>
      <p className={styles.sourceLabel}>
        {metadata.source.kind === "synthetic"
          ? "SYNTHETIC SAMPLE"
          : metadata.source.name}
      </p>
      {metadata.source.kind === "synthetic" && (
        <p>Invented season, people and results. No real championship data.</p>
      )}
      {state.status !== "error" && (
        <>
          <p className={styles.flags}>
            <span>
              {state.metadata.freshness === "stale"
                ? "Stale snapshot"
                : "Retrieved snapshot"}
            </span>
            <span>
              {state.metadata.finality === "provisional"
                ? "Provisional"
                : state.metadata.finality === "final"
                  ? "Source marked final"
                  : "Finality unknown"}
            </span>
            <span>
              {state.metadata.completeness === "partial"
                ? "Partial dataset — entries may be missing"
                : state.metadata.completeness === "unknown"
                  ? "Coverage not confirmed"
                  : "Complete supplied dataset"}
            </span>
          </p>
          <p>
            Retrieved{" "}
            <time dateTime={state.metadata.retrievedAt}>
              {instantText(state.metadata.retrievedAt)}
            </time>
            {state.metadata.cache === "hit" ? " · Cached" : ""}
          </p>
          {state.metadata.sourceUpdatedAt && (
            <p>
              Source updated{" "}
              <time dateTime={state.metadata.sourceUpdatedAt}>
                {instantText(state.metadata.sourceUpdatedAt)}
              </time>
            </p>
          )}
          {state.metadata.revalidationError && (
            <p>Refresh failed; showing the last retrieved snapshot.</p>
          )}
        </>
      )}
      {state.status === "error" && (
        <p>
          Attempted{" "}
          <time dateTime={state.metadata.attemptedAt}>
            {instantText(state.metadata.attemptedAt)}
          </time>
        </p>
      )}
      {metadata.source.attribution.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

const availabilityCopy = {
  "unknown-season":
    "This season is not available from the selected source. Choose another season.",
  "unknown-event": "This event is not available from the selected source.",
  "not-published":
    "The source has not published this data yet. Check again after publication.",
  "not-covered":
    "The supplied dataset cannot establish this information. No result has been inferred.",
  cancelled: "This session or dataset is cancelled. No result is available.",
};

export function DataMessage({
  state,
  emptyCopy,
}: {
  state: DataState<unknown>;
  emptyCopy: string;
}) {
  switch (state.status) {
    case "loading":
      return (
        <div className={styles.state} role="status">
          <span className={styles.skeletonLine} aria-hidden="true" />
          <p>Loading data…</p>
        </div>
      );
    case "success":
      return null;
    case "empty":
      return (
        <div className={styles.state}>
          <p className={styles.stateTitle}>No entries</p>
          <p>{emptyCopy}</p>
        </div>
      );
    case "unavailable":
      return (
        <div className={styles.state}>
          <p className={styles.stateTitle}>Data unavailable</p>
          <p>{availabilityCopy[state.reason]}</p>
        </div>
      );
    case "error":
      return (
        <div className={styles.state} role="status">
          <p className={styles.stateTitle}>Unable to load data</p>
          <p>{state.error.message}</p>
          <p>
            {state.error.retryable
              ? "Refresh this season to try again."
              : "This request cannot be retried automatically. Choose another season or check again later."}
          </p>
          {state.error.retryAt && (
            <p>Retry after {instantText(state.error.retryAt)}</p>
          )}
        </div>
      );
  }
}

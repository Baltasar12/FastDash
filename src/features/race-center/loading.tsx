import styles from "./race-center.module.css";

/** Use as the host route's loading UI or a Suspense fallback. */
export function RaceCenterLoading() {
  return (
    <section
      className={styles.root}
      aria-busy="true"
      aria-label="Race center loading"
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.eyebrow}>SECTOR / EVENT EXPLORER</p>
          <h1 className={styles.pageTitle}>Race center.</h1>
        </div>
        <p className={styles.intro} role="status">
          Loading reported events and session data…
        </p>
      </header>
      <p className={styles.stateCopy}>
        Your selected season, event and session will appear here. No results are
        shown until they are available.
      </p>
    </section>
  );
}

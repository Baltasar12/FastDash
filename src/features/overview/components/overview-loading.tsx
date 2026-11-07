import styles from "../overview.module.css";

export function OverviewLoading() {
  return (
    <div className={styles.overview} aria-busy="true">
      <div className={styles.loadingHero}>
        <p className={styles.label}>SECTOR / OVERVIEW</p>
        <h1>Season in focus.</h1>
        <p role="status">Loading the season overview…</p>
      </div>
      <div className={styles.loadingPanel} aria-hidden="true">
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonTitle} />
        <span className={styles.skeletonLine} />
      </div>
      <div className={styles.loadingLedgers} aria-hidden="true">
        {[1, 2].map((item) => (
          <div key={item}>
            {[1, 2, 3].map((line) => (
              <span className={styles.skeletonLine} key={line} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

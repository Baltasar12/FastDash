import Link from "next/link";

export function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="SECTOR home">
      <span className="sector-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      SECTOR
      <span className="wordmark-dot" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}

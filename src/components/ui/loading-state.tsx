export function LoadingState({ label = "Loading SECTOR" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-track" aria-hidden="true" />
      <span className="eyebrow">{label}</span>
    </div>
  );
}

export default function ProgressBar({ value, label, size = "md" }) {
  const pct = Math.min(100, Math.max(0, Math.round(value || 0)));
  return (
    <div
      className={`progress progress-${size}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Progress"}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

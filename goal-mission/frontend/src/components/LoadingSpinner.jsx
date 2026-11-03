export default function LoadingSpinner({ label = "Loading...", block = false }) {
  const spinner = <span className="spinner" aria-hidden="true" />;
  if (!block) {
    return (
      <span className="inline-loading" role="status">
        {spinner}
        <span>{label}</span>
      </span>
    );
  }
  return (
    <div className="loading-block" role="status">
      {spinner}
      <p>{label}</p>
    </div>
  );
}

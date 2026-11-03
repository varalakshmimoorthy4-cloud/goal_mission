import { capitalize } from "../utils/format";

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{capitalize(priority)} priority</span>;
}

export function StatusBadge({ status }) {
  if (status === "completed") return <span className="badge badge-completed">Completed</span>;
  return <span className="badge badge-active">Active</span>;
}

export function AIBadge() {
  return (
    <span className="badge badge-ai" title="This mission was created from an AI-generated plan">
      AI plan
    </span>
  );
}

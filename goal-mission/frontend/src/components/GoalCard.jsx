import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import ProgressBar from "./ProgressBar";
import { PriorityBadge } from "./Badges";
import { dueLabel, formatDate } from "../utils/format";

export default function GoalCard({ goal }) {
  const { progress } = goal;
  const completed = goal.status === "completed";
  return (
    <Link to={`/goals/${goal.id}`} className={`card goal-card${completed ? " is-completed" : ""}`}>
      <div className="goal-card-top">
        <span className="badge badge-category">{goal.category}</span>
        <PriorityBadge priority={goal.priority} />
      </div>
      <h3 className="goal-card-title">
        {completed && <CheckCircle2 size={18} className="text-success" aria-label="Completed" />} {goal.title}
      </h3>
      {goal.description && <p className="goal-card-desc">{goal.description}</p>}
      <div className="goal-card-progress">
        <div className="row-between">
          <span className="muted small">
            {progress.completed_missions}/{progress.total_missions} missions
          </span>
          <strong className="small">{progress.percentage}%</strong>
        </div>
        <ProgressBar value={progress.percentage} label={`${goal.title} progress`} />
      </div>
      <div className="goal-card-meta">
        <span className={`meta-item${goal.is_overdue ? " text-danger" : ""}`}>
          <CalendarDays size={15} aria-hidden="true" />
          {goal.target_date ? formatDate(goal.target_date) : "No target date"}
        </span>
        {!completed && goal.target_date && (
          <span className={`small ${goal.is_overdue ? "text-danger" : "muted"}`}>{dueLabel(goal.days_until_target)}</span>
        )}
        {progress.overdue_missions > 0 && !completed && (
          <span className="badge badge-overdue">{progress.overdue_missions} overdue</span>
        )}
      </div>
    </Link>
  );
}

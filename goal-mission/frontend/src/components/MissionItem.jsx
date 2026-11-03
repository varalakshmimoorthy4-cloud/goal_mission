import { Link } from "react-router-dom";
import { CalendarDays, Check, Clock, Pencil, Trash2 } from "lucide-react";
import { AIBadge, PriorityBadge } from "./Badges";
import { dueLabel, formatDate, formatMinutes } from "../utils/format";

// One row in a mission list. `onEdit` / `onDelete` are optional (compact lists omit them).
export default function MissionItem({ mission, onToggle, onEdit, onDelete, showGoal = false }) {
  const done = mission.status === "completed";
  return (
    <li className={`mission-item${done ? " done" : ""}${mission.is_overdue ? " overdue" : ""}`}>
      <button
        className={`check-btn${done ? " checked" : ""}`}
        onClick={() => onToggle(mission)}
        aria-pressed={done}
        aria-label={done ? `Mark "${mission.title}" as not done` : `Mark "${mission.title}" as done`}
      >
        {done && <Check size={16} strokeWidth={3} />}
      </button>

      <div className="mission-main">
        <Link to={`/missions/${mission.id}`} className="mission-title">
          {mission.title}
        </Link>
        {showGoal && mission.goal_title && (
          <Link to={`/goals/${mission.goal_id}`} className="mission-goal muted small">
            {mission.goal_title}
          </Link>
        )}
        <div className="mission-meta">
          <PriorityBadge priority={mission.priority} />
          {mission.due_date && (
            <span className={`meta-item${mission.is_overdue ? " text-danger" : ""}`}>
              <CalendarDays size={14} aria-hidden="true" />
              {formatDate(mission.due_date)} &middot; {dueLabel(mission.days_until_due, done)}
            </span>
          )}
          {mission.estimated_minutes && (
            <span className="meta-item">
              <Clock size={14} aria-hidden="true" />
              {formatMinutes(mission.estimated_minutes)}
            </span>
          )}
          {mission.ai_generated && <AIBadge />}
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="mission-actions">
          {onEdit && (
            <button className="icon-btn" onClick={() => onEdit(mission)} aria-label={`Edit "${mission.title}"`}>
              <Pencil size={16} />
            </button>
          )}
          {onDelete && (
            <button className="icon-btn danger" onClick={() => onDelete(mission)} aria-label={`Delete "${mission.title}"`}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

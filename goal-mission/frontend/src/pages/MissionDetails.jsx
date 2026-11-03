import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import MissionForm from "../components/MissionForm";
import Modal from "../components/Modal";
import ProgressBar from "../components/ProgressBar";
import { AIBadge, PriorityBadge } from "../components/Badges";
import { dueLabel, formatDate, formatMinutes } from "../utils/format";

export default function MissionDetails() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null); // null | 'edit' | 'delete'
  useDocumentTitle(data ? data.mission.title : "Mission");

  const load = useCallback(async () => {
    try {
      setData(await api.missions.get(missionId));
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [missionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="card">
        <EmptyState
          title={error.status === 404 ? "Mission not found" : "Could not load this mission"}
          action={<Link to="/goals" className="btn btn-primary">Back to goals</Link>}
        >
          {error.status === 404 ? "It may have been deleted." : error.message}
        </EmptyState>
      </div>
    );
  }
  if (!data) return <LoadingSpinner block label="Loading mission..." />;

  const { mission, goal_progress: goalProgress } = data;
  const done = mission.status === "completed";

  const handleToggle = async () => {
    try {
      await api.missions.toggle(mission.id);
      toast.success(done ? "Mission re-opened." : "Mission completed. Nice work!");
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <Link to={`/goals/${mission.goal_id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to {mission.goal_title}
      </Link>

      <section className={`card mission-detail${mission.is_overdue ? " overdue" : ""}`}>
        <div className="row-between wrap">
          <div className="badge-row">
            <PriorityBadge priority={mission.priority} />
            <span className={`badge ${done ? "badge-completed" : mission.is_overdue ? "badge-overdue" : "badge-active"}`}>
              {done ? "Completed" : mission.is_overdue ? "Overdue" : "Pending"}
            </span>
            {mission.ai_generated && <AIBadge />}
          </div>
          <div className="button-row">
            <button className="btn btn-secondary btn-sm" onClick={() => setDialog("edit")}>
              <Pencil size={15} aria-hidden="true" /> Edit
            </button>
            <button className="btn btn-danger-outline btn-sm" onClick={() => setDialog("delete")}>
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          </div>
        </div>

        <h1>{mission.title}</h1>
        {mission.description ? <p className="goal-description">{mission.description}</p> : <p className="muted">No description.</p>}

        <dl className="detail-list">
          <div>
            <dt><CalendarDays size={15} aria-hidden="true" /> Due date</dt>
            <dd className={mission.is_overdue ? "text-danger" : ""}>
              {mission.due_date ? `${formatDate(mission.due_date)} (${dueLabel(mission.days_until_due, done)})` : "Not set"}
            </dd>
          </div>
          <div>
            <dt><Clock size={15} aria-hidden="true" /> Estimated time</dt>
            <dd>{mission.estimated_minutes ? formatMinutes(mission.estimated_minutes) : "Not set"}</dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd><Link to={`/goals/${mission.goal_id}`}>{mission.goal_title}</Link></dd>
          </div>
          {mission.completed_at && (
            <div>
              <dt>Completed</dt>
              <dd>{new Date(mission.completed_at).toLocaleString()}</dd>
            </div>
          )}
        </dl>

        <button className={`btn ${done ? "btn-secondary" : "btn-success"}`} onClick={handleToggle}>
          {done ? <><RotateCcw size={16} aria-hidden="true" /> Mark as not done</> : <><CheckCircle2 size={16} aria-hidden="true" /> Mark as completed</>}
        </button>
      </section>

      <section className="card" aria-labelledby="goal-progress-title">
        <h2 id="goal-progress-title" className="card-title">Goal progress</h2>
        <div className="row-between">
          <span className="muted">
            {goalProgress.completed_missions} of {goalProgress.total_missions} missions completed
          </span>
          <strong>{goalProgress.percentage}%</strong>
        </div>
        <ProgressBar value={goalProgress.percentage} label="Goal progress" />
      </section>

      {dialog === "edit" && (
        <Modal title="Edit mission" onClose={() => setDialog(null)}>
          <MissionForm
            initial={mission}
            submitLabel="Save changes"
            onCancel={() => setDialog(null)}
            onSubmit={async (values) => {
              await api.missions.update(mission.id, values);
              toast.success("Mission updated.");
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}
      {dialog === "delete" && (
        <ConfirmDialog
          title="Delete this mission?"
          message={`"${mission.title}" will be permanently deleted.`}
          confirmLabel="Delete mission"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await api.missions.remove(mission.id);
              toast.success("Mission deleted.");
              navigate(`/goals/${mission.goal_id}`, { replace: true });
            } catch (err) {
              toast.error(err.message);
              setDialog(null);
            }
          }}
        />
      )}
    </>
  );
}

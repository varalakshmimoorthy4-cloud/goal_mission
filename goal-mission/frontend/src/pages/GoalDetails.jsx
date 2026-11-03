import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, ListChecks, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import GoalForm from "../components/GoalForm";
import LoadingSpinner from "../components/LoadingSpinner";
import MissionForm from "../components/MissionForm";
import MissionItem from "../components/MissionItem";
import Modal from "../components/Modal";
import ProgressBar from "../components/ProgressBar";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { dueLabel, formatDate, formatMinutes } from "../utils/format";

export default function GoalDetails() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [goal, setGoal] = useState(null);
  const [missions, setMissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sort, setSort] = useState("due_date");
  const [error, setError] = useState(null);
  // dialog: null | {type: 'editGoal'|'deleteGoal'|'addMission'|'editMission'|'deleteMission', mission?}
  const [dialog, setDialog] = useState(null);
  useDocumentTitle(goal ? goal.title : "Goal");

  const load = useCallback(async () => {
    try {
      const [goalData, missionData, progressData] = await Promise.all([
        api.goals.get(goalId),
        api.missions.listForGoal(goalId, sort),
        api.goals.progress(goalId),
      ]);
      setGoal(goalData.goal);
      setMissions(missionData.missions);
      setSummary(progressData);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [goalId, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, successMessage) => {
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  if (error) {
    return (
      <div className="card">
        <EmptyState
          title={error.status === 404 ? "Goal not found" : "Could not load this goal"}
          action={<Link to="/goals" className="btn btn-primary">Back to goals</Link>}
        >
          {error.status === 404 ? "It may have been deleted." : error.message}
        </EmptyState>
      </div>
    );
  }
  if (!goal || !summary) return <LoadingSpinner block label="Loading goal..." />;

  const { progress } = goal;
  const completed = goal.status === "completed";
  const allDone = progress.total_missions > 0 && progress.percentage === 100 && !completed;

  return (
    <>
      <Link to="/goals" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> All goals</Link>

      <section className="card goal-header">
        <div className="row-between wrap">
          <div className="badge-row">
            <span className="badge badge-category">{goal.category}</span>
            <PriorityBadge priority={goal.priority} />
            <StatusBadge status={goal.status} />
          </div>
          <div className="button-row">
            <button className="btn btn-secondary btn-sm" onClick={() => setDialog({ type: "editGoal" })}>
              <Pencil size={15} aria-hidden="true" /> Edit
            </button>
            {completed ? (
              <button className="btn btn-secondary btn-sm" onClick={() => run(() => api.goals.complete(goal.id, false), "Goal re-opened.")}>
                <RotateCcw size={15} aria-hidden="true" /> Re-open
              </button>
            ) : (
              <button className="btn btn-success btn-sm" onClick={() => run(() => api.goals.complete(goal.id, true), "Goal marked as completed. Well done!")}>
                <CheckCircle2 size={15} aria-hidden="true" /> Mark completed
              </button>
            )}
            <button className="btn btn-danger-outline btn-sm" onClick={() => setDialog({ type: "deleteGoal" })}>
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
        <h1>{goal.title}</h1>
        {goal.description && <p className="goal-description">{goal.description}</p>}
        <p className={`meta-item${goal.is_overdue ? " text-danger" : ""}`}>
          <CalendarDays size={16} aria-hidden="true" />
          {goal.target_date ? <>Target: {formatDate(goal.target_date)} &middot; {completed ? "Completed" : dueLabel(goal.days_until_target)}</> : "No target date set"}
        </p>
      </section>

      {allDone && (
        <div className="banner banner-success" role="status">
          <span>All missions are complete. Ready to mark this goal as completed?</span>
          <button className="btn btn-success btn-sm" onClick={() => run(() => api.goals.complete(goal.id, true), "Goal marked as completed. Well done!")}>
            Mark goal completed
          </button>
        </div>
      )}

      <section className="card" aria-labelledby="summary-title">
        <h2 id="summary-title" className="card-title">Progress summary</h2>
        <div className="row-between">
          <span className="muted">{progress.completed_missions} of {progress.total_missions} missions completed</span>
          <strong>{progress.percentage}%</strong>
        </div>
        <ProgressBar value={progress.percentage} label="Goal progress" size="lg" />
        <dl className="summary-grid">
          <div><dt>Completed</dt><dd>{progress.completed_missions}</dd></div>
          <div><dt>Pending</dt><dd>{progress.pending_missions}</dd></div>
          <div><dt>Overdue</dt><dd className={progress.overdue_missions ? "text-danger" : ""}>{progress.overdue_missions}</dd></div>
          <div><dt>Next due</dt><dd>{summary.next_due_date ? formatDate(summary.next_due_date) : "-"}</dd></div>
          <div><dt>Time remaining</dt><dd>{summary.estimated_minutes_remaining ? formatMinutes(summary.estimated_minutes_remaining) : "-"}</dd></div>
        </dl>
      </section>

      <section className="card" aria-labelledby="missions-title">
        <div className="row-between wrap">
          <h2 id="missions-title" className="card-title">Missions</h2>
          <div className="button-row">
            <select className="select select-sm" aria-label="Sort missions" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="due_date">Sort: due date</option>
              <option value="priority">Sort: priority</option>
              <option value="created">Sort: newest</option>
            </select>
            <Link to="/planner" className="btn btn-secondary btn-sm">Plan with AI</Link>
            <button className="btn btn-primary btn-sm" onClick={() => setDialog({ type: "addMission" })}>
              <Plus size={15} aria-hidden="true" /> Add mission
            </button>
          </div>
        </div>

        {missions.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No missions yet"
            action={<button className="btn btn-primary" onClick={() => setDialog({ type: "addMission" })}>Add the first mission</button>}
          >
            Break this goal into small steps you can finish in one sitting.
          </EmptyState>
        ) : (
          <ul className="mission-list">
            {missions.map((m) => (
              <MissionItem
                key={m.id}
                mission={m}
                onToggle={(mission) => run(() => api.missions.toggle(mission.id))}
                onEdit={(mission) => setDialog({ type: "editMission", mission })}
                onDelete={(mission) => setDialog({ type: "deleteMission", mission })}
              />
            ))}
          </ul>
        )}
      </section>

      {dialog?.type === "editGoal" && (
        <Modal title="Edit goal" onClose={() => setDialog(null)}>
          <GoalForm
            initial={goal}
            submitLabel="Save changes"
            onCancel={() => setDialog(null)}
            onSubmit={async (values) => {
              await api.goals.update(goal.id, values);
              toast.success("Goal updated.");
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}
      {dialog?.type === "deleteGoal" && (
        <ConfirmDialog
          title="Delete this goal?"
          message={`"${goal.title}" and all of its ${progress.total_missions} mission(s) will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete goal"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await api.goals.remove(goal.id);
              toast.success("Goal deleted.");
              navigate("/goals", { replace: true });
            } catch (err) {
              toast.error(err.message);
              setDialog(null);
            }
          }}
        />
      )}
      {dialog?.type === "addMission" && (
        <Modal title="Add a mission" onClose={() => setDialog(null)}>
          <MissionForm
            submitLabel="Add mission"
            onCancel={() => setDialog(null)}
            onSubmit={async (values) => {
              await api.missions.create(goal.id, values);
              toast.success("Mission added.");
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}
      {dialog?.type === "editMission" && (
        <Modal title="Edit mission" onClose={() => setDialog(null)}>
          <MissionForm
            initial={dialog.mission}
            submitLabel="Save changes"
            onCancel={() => setDialog(null)}
            onSubmit={async (values) => {
              await api.missions.update(dialog.mission.id, values);
              toast.success("Mission updated.");
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}
      {dialog?.type === "deleteMission" && (
        <ConfirmDialog
          title="Delete this mission?"
          message={`"${dialog.mission.title}" will be permanently deleted.`}
          confirmLabel="Delete mission"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await api.missions.remove(dialog.mission.id);
              toast.success("Mission deleted.");
              setDialog(null);
              await load();
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

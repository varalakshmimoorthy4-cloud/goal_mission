import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, CheckCircle2, Flag, ListChecks, Plus, Sparkles, Target } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import MissionItem from "../components/MissionItem";
import ProgressBar from "../components/ProgressBar";
import { CompletionDonut, GoalProgressChart, WeeklyChart } from "../components/ProgressChart";
import { timeAgo } from "../utils/format";

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="card stat-card">
      <span className={`stat-icon tone-${tone}`} aria-hidden="true">
        <Icon size={22} />
      </span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      // The browser's UTC offset lets the server group "completed today" by the user's own day.
      setStats(await api.dashboard.stats(-new Date().getTimezoneOffset()));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (mission) => {
    try {
      await api.missions.toggle(mission.id);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (error && !stats) {
    return (
      <div className="banner banner-danger" role="alert">
        Could not load the dashboard: {error}{" "}
        <button className="btn btn-sm btn-secondary" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!stats) return <LoadingSpinner block label="Loading dashboard..." />;

  const firstName = user.name.split(" ")[0];
  const reminderDays = user.preferences.reminder_days;
  const dueSoon = stats.upcoming_missions.filter((m) => m.days_until_due <= reminderDays);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome back, {firstName}!</h1>
          <p className="page-sub">
            {stats.completed_last_7_days} of your weekly target of {stats.weekly_target} missions completed in the last 7 days.
          </p>
        </div>
        <Link to="/goals" className="btn btn-primary">
          <Plus size={17} aria-hidden="true" /> New goal
        </Link>
      </div>

      {(stats.overdue_missions > 0 || dueSoon.length > 0) && (
        <section className="card reminders" aria-labelledby="reminders-title">
          <h2 id="reminders-title" className="card-title">
            <BellRing size={18} aria-hidden="true" /> Reminders
          </h2>
          {stats.overdue_missions > 0 && (
            <p className="reminder danger">
              <AlertTriangle size={16} aria-hidden="true" /> You have <strong>{stats.overdue_missions}</strong> overdue mission
              {stats.overdue_missions === 1 ? "" : "s"}. <Link to="/calendar">Review deadlines</Link>
            </p>
          )}
          {dueSoon.map((m) => (
            <p className="reminder" key={m.id}>
              <BellRing size={16} aria-hidden="true" /> <Link to={`/missions/${m.id}`}>{m.title}</Link> is{" "}
              {m.days_until_due === 0 ? "due today" : `due in ${m.days_until_due} day${m.days_until_due === 1 ? "" : "s"}`}.
            </p>
          ))}
          <p className="hint">In-app reminders appear here while you use Goal Mission. No emails, SMS or push notifications are sent.</p>
        </section>
      )}

      <div className="grid-stats">
        <StatCard icon={Target} label="Total goals" value={stats.total_goals} tone="purple" />
        <StatCard icon={ListChecks} label="Active goals" value={stats.active_goals} tone="blue" />
        <StatCard icon={CheckCircle2} label="Completed goals" value={stats.completed_goals} tone="green" />
        <StatCard icon={Flag} label="Overall completion" value={`${stats.completion_percentage}%`} tone="violet" />
      </div>

      {stats.total_goals === 0 ? (
        <div className="card">
          <EmptyState
            icon={Target}
            title="No goals yet"
            action={
              <div className="button-row">
                <Link to="/goals" className="btn btn-primary">Create a goal</Link>
                <Link to="/planner" className="btn btn-secondary"><Sparkles size={16} aria-hidden="true" /> Plan with AI</Link>
              </div>
            }
          >
            Create your first goal, or let the AI planner break one into missions for you.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="grid-2">
            <section className="card" aria-labelledby="weekly-title">
              <h2 id="weekly-title" className="card-title">Missions completed this week</h2>
              <WeeklyChart data={stats.weekly} />
            </section>
            <section className="card" aria-labelledby="donut-title">
              <h2 id="donut-title" className="card-title">Overall progress</h2>
              <CompletionDonut percentage={stats.completion_percentage} />
              <p className="center muted small">
                {stats.completed_missions} completed &middot; {stats.pending_missions} pending
                {stats.overdue_missions > 0 && <> &middot; <span className="text-danger">{stats.overdue_missions} overdue</span></>}
              </p>
            </section>
          </div>

          <div className="grid-2">
            <section className="card" aria-labelledby="upcoming-title">
              <div className="row-between">
                <h2 id="upcoming-title" className="card-title">Upcoming mission deadlines</h2>
                <Link to="/calendar" className="small">View calendar</Link>
              </div>
              {stats.upcoming_missions.length === 0 ? (
                <p className="muted">Nothing due soon. Add due dates to your missions to see them here.</p>
              ) : (
                <ul className="mission-list compact">
                  {stats.upcoming_missions.map((m) => (
                    <MissionItem key={m.id} mission={m} onToggle={handleToggle} showGoal />
                  ))}
                </ul>
              )}
            </section>

            <section className="card" aria-labelledby="goal-progress-title">
              <h2 id="goal-progress-title" className="card-title">Active goal progress</h2>
              {stats.goal_progress.length === 0 ? (
                <p className="muted">No active goals right now.</p>
              ) : (
                <GoalProgressChart data={stats.goal_progress} />
              )}
            </section>
          </div>

          <section className="card" aria-labelledby="activity-title">
            <h2 id="activity-title" className="card-title">Recent activity</h2>
            {stats.recent_activity.length === 0 ? (
              <p className="muted">Complete a mission to see your activity here.</p>
            ) : (
              <ul className="activity-list">
                {stats.recent_activity.map((item, index) => (
                  <li key={`${item.timestamp}-${index}`}>
                    <span className={`activity-dot ${item.type}`} aria-hidden="true" />
                    <span className="activity-text">{item.message}</span>
                    <time className="muted small" dateTime={item.timestamp}>{timeAgo(item.timestamp)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {stats.goal_progress.length > 0 && (
            <section className="card" aria-labelledby="bars-title">
              <h2 id="bars-title" className="card-title">Progress by goal</h2>
              <ul className="plain-list">
                {stats.goal_progress.map((g) => (
                  <li key={g.id} className="progress-row">
                    <Link to={`/goals/${g.id}`}>{g.title}</Link>
                    <ProgressBar value={g.percentage} label={`${g.title} progress`} />
                    <strong className="small">{g.percentage}%</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

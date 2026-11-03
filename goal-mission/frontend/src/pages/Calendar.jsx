import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import LoadingSpinner from "../components/LoadingSpinner";
import MissionItem from "../components/MissionItem";
import { dueLabel, formatDate, parseLocalDate, toISODate, todayISO } from "../utils/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// 42 cells (6 weeks) starting on the Sunday on/before the 1st of the month.
function buildMonth(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function Calendar() {
  useDocumentTitle("Calendar & Deadlines");
  const toast = useToast();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(todayISO());
  const [allMissions, setAllMissions] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [missionData, upcomingData] = await Promise.all([api.missions.list({ sort: "due_date" }), api.dashboard.upcoming(30)]);
      setAllMissions(missionData.missions);
      setUpcoming(upcomingData);
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

  // Group missions and goal deadlines by date for the month grid.
  const byDate = useMemo(() => {
    const map = {};
    const add = (iso, item) => {
      if (!iso) return;
      (map[iso] = map[iso] || []).push(item);
    };
    (allMissions || []).forEach((m) => add(m.due_date, { kind: "mission", data: m }));
    (upcoming?.goal_deadlines || []).forEach((g) => add(g.target_date, { kind: "goal", data: g }));
    return map;
  }, [allMissions, upcoming]);

  if (error && !allMissions) {
    return (
      <div className="banner banner-danger" role="alert">
        Could not load deadlines: {error} <button className="btn btn-sm btn-secondary" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!allMissions || !upcoming) return <LoadingSpinner block label="Loading calendar..." />;

  const cells = buildMonth(cursor);
  const today = todayISO();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shiftMonth = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const selectedItems = byDate[selected] || [];
  const dueSoon = upcoming.upcoming_missions.filter((m) => m.days_until_due <= upcoming.reminder_days);
  const later = upcoming.upcoming_missions.filter((m) => m.days_until_due > upcoming.reminder_days);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Calendar & Deadlines</h1>
          <p className="page-sub">See what is due, what is overdue and what is coming up next.</p>
        </div>
      </div>

      <div className="calendar-layout">
        <section className="card" aria-labelledby="month-title">
          <div className="calendar-nav">
            <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={20} /></button>
            <h2 id="month-title" aria-live="polite">{monthLabel}</h2>
            <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={20} /></button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelected(today); }}
            >
              Today
            </button>
          </div>

          <div className="calendar-grid" role="grid" aria-labelledby="month-title">
            {WEEKDAYS.map((d) => <div key={d} className="calendar-weekday" role="columnheader">{d}</div>)}
            {cells.map((date) => {
              const iso = toISODate(date);
              const items = byDate[iso] || [];
              const outside = date.getMonth() !== cursor.getMonth();
              const hasOverdue = items.some((i) => i.kind === "mission" && i.data.is_overdue);
              const hasPending = items.some((i) => i.kind === "mission" && i.data.status === "pending" && !i.data.is_overdue);
              const hasDone = items.some((i) => i.kind === "mission" && i.data.status === "completed");
              const hasGoal = items.some((i) => i.kind === "goal");
              return (
                <button
                  key={iso}
                  role="gridcell"
                  className={`calendar-day${outside ? " outside" : ""}${iso === today ? " today" : ""}${iso === selected ? " selected" : ""}`}
                  onClick={() => setSelected(iso)}
                  aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}${items.length ? `, ${items.length} item${items.length === 1 ? "" : "s"} due` : ""}`}
                  aria-pressed={iso === selected}
                >
                  <span className="day-number">{date.getDate()}</span>
                  <span className="day-dots" aria-hidden="true">
                    {hasOverdue && <i className="dot-overdue" />}
                    {hasPending && <i className="dot-pending" />}
                    {hasDone && <i className="dot-done" />}
                    {hasGoal && <i className="dot-goal" />}
                  </span>
                </button>
              );
            })}
          </div>

          <ul className="legend" aria-label="Calendar legend">
            <li><i className="dot-overdue" /> Overdue</li>
            <li><i className="dot-pending" /> Pending</li>
            <li><i className="dot-done" /> Completed</li>
            <li><i className="dot-goal" /> Goal deadline</li>
          </ul>

          <h3 className="subheading">{formatDate(selected)}</h3>
          {selectedItems.length === 0 ? (
            <p className="muted">Nothing due on this day.</p>
          ) : (
            <>
              {selectedItems.filter((i) => i.kind === "goal").map(({ data: g }) => (
                <p key={`g${g.id}`} className="goal-deadline-row">
                  <Flag size={16} aria-hidden="true" /> Goal deadline: <Link to={`/goals/${g.id}`}>{g.title}</Link>
                </p>
              ))}
              <ul className="mission-list compact">
                {selectedItems.filter((i) => i.kind === "mission").map(({ data: m }) => (
                  <MissionItem key={m.id} mission={m} onToggle={handleToggle} showGoal />
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="calendar-side" aria-label="Deadline lists">
          <section className="card" aria-labelledby="overdue-title">
            <h2 id="overdue-title" className="card-title text-danger"><AlertTriangle size={18} aria-hidden="true" /> Overdue ({upcoming.overdue_missions.length})</h2>
            {upcoming.overdue_missions.length === 0 ? (
              <p className="muted">Nothing overdue. Great job!</p>
            ) : (
              <ul className="mission-list compact">
                {upcoming.overdue_missions.map((m) => <MissionItem key={m.id} mission={m} onToggle={handleToggle} showGoal />)}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="soon-title">
            <h2 id="soon-title" className="card-title"><BellRing size={18} aria-hidden="true" /> Reminders: due within {upcoming.reminder_days} day{upcoming.reminder_days === 1 ? "" : "s"}</h2>
            {dueSoon.length === 0 ? (
              <p className="muted">No missions due soon.</p>
            ) : (
              <ul className="mission-list compact">
                {dueSoon.map((m) => <MissionItem key={m.id} mission={m} onToggle={handleToggle} showGoal />)}
              </ul>
            )}
            <p className="hint">In-app reminders only. Change the window in Profile &amp; Settings. No emails, SMS or push notifications are sent.</p>
          </section>

          <section className="card" aria-labelledby="later-title">
            <h2 id="later-title" className="card-title">Next 30 days</h2>
            {later.length === 0 && upcoming.goal_deadlines.length === 0 ? (
              <p className="muted">No other deadlines in the next 30 days.</p>
            ) : (
              <>
                {upcoming.goal_deadlines.map((g) => (
                  <p key={g.id} className="goal-deadline-row">
                    <Flag size={16} aria-hidden="true" />
                    <span><Link to={`/goals/${g.id}`}>{g.title}</Link> <span className={g.is_overdue ? "text-danger small" : "muted small"}>({formatDate(g.target_date)}, {dueLabel(g.days_until_target)})</span></span>
                  </p>
                ))}
                <ul className="mission-list compact">
                  {later.map((m) => <MissionItem key={m.id} mission={m} onToggle={handleToggle} showGoal />)}
                </ul>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

// parseLocalDate is re-exported for tests/utilities that import it from this module path
export { parseLocalDate };

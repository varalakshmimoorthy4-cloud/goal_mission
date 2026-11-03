import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Lightbulb, ListOrdered, Save, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { api, ApiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import Field from "../components/Field";
import LoadingSpinner from "../components/LoadingSpinner";
import { CATEGORIES, PRIORITIES, SKILL_LEVELS } from "../utils/constants";
import { formatMinutes, toISODate } from "../utils/format";

const twoWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return toISODate(date);
};

export default function AIPlanner() {
  useDocumentTitle("AI Goal Planner");
  const toast = useToast();
  const navigate = useNavigate();

  const [aiStatus, setAiStatus] = useState(null);
  const [form, setForm] = useState({ goal: "", hours_per_week: "5", skill_level: "beginner", deadline: twoWeeksFromNow(), notes: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [generating, setGenerating] = useState(false);

  const [result, setResult] = useState(null); // response from POST /ai/plan
  const [missions, setMissions] = useState([]); // editable copy of result.plan.missions
  const [existingGoals, setExistingGoals] = useState([]);
  const [save, setSave] = useState({ mode: "new", title: "", description: "", category: "Learning", priority: "medium", goalId: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.ai.status().then(setAiStatus).catch(() => setAiStatus(null));
    api.goals.list({ status: "active" }).then((d) => setExistingGoals(d.goals)).catch(() => {});
  }, []);

  const setField = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleGenerate = async (event) => {
    event.preventDefault();
    const found = {};
    if (!form.goal.trim()) found.goal = "Describe the goal you want a plan for.";
    const hours = Number(form.hours_per_week);
    if (!hours || hours < 0.5 || hours > 100) found.hours_per_week = "Enter between 0.5 and 100 hours per week.";
    if (!form.deadline) found.deadline = "Choose a target deadline.";
    else if (form.deadline < toISODate(new Date())) found.deadline = "Deadline cannot be in the past.";
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setGenerating(true);
    setResult(null);
    try {
      const data = await api.ai.plan({ ...form, hours_per_week: hours });
      setResult(data);
      setMissions(data.plan.missions.map((m, i) => ({ ...m, key: i, due_date: m.suggested_due_date })));
      setSave((s) => ({
        ...s,
        title: data.request.goal,
        description: data.plan.goal_description || "",
        goalId: existingGoals[0] ? String(existingGoals[0].id) : "",
      }));
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details || {});
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const updateMission = (key, field, value) =>
    setMissions((list) => list.map((m) => (m.key === key ? { ...m, [field]: value } : m)));
  const removeMission = (key) => setMissions((list) => list.filter((m) => m.key !== key));

  const handleSave = async () => {
    const payload = [];
    for (const m of missions) {
      const minutes = Number(m.estimated_minutes);
      if (!m.title.trim()) return toast.error("Every mission needs a title (or remove it).");
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
        return toast.error(`"${m.title}": estimated time must be 1-1440 minutes.`);
      }
      payload.push({ title: m.title, description: m.description, priority: m.priority, due_date: m.due_date || null, estimated_minutes: minutes });
    }
    if (payload.length === 0) return toast.error("Keep at least one mission to save.");
    if (save.mode === "new" && !save.title.trim()) return toast.error("Give the new goal a title.");
    if (save.mode === "existing" && !save.goalId) return toast.error("Choose which goal to add the missions to.");

    setSaving(true);
    let createdGoalId = null;
    try {
      let goalId = save.goalId;
      if (save.mode === "new") {
        const { goal } = await api.goals.create({
          title: save.title,
          description: save.description,
          category: save.category,
          priority: save.priority,
          target_date: result.request.deadline,
        });
        goalId = goal.id;
        createdGoalId = goal.id;
      }
      await api.missions.bulkCreate(goalId, payload, result.ai_generated);
      toast.success(`${payload.length} missions saved to your goal.`);
      navigate(`/goals/${goalId}`);
    } catch (err) {
      // If we created a brand-new goal but could not save its missions, undo it.
      if (createdGoalId) await api.goals.remove(createdGoalId).catch(() => {});
      toast.error(err instanceof ApiError ? err.message : "Could not save the plan.");
      setSaving(false);
    }
  };

  const plan = result?.plan;
  const totalMinutes = missions.reduce((sum, m) => sum + (Number(m.estimated_minutes) || 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>AI Goal Planner</h1>
          <p className="page-sub">Describe a goal and get a step-by-step plan you can review, edit and save as missions.</p>
        </div>
        {aiStatus && (
          <span className={`status-chip ${aiStatus.ai_available ? "on" : "off"}`} title={aiStatus.message || ""}>
            <span className="dot" aria-hidden="true" />
            {aiStatus.ai_available ? `AI on (${aiStatus.model})` : "AI off - template mode"}
          </span>
        )}
      </div>

      {aiStatus && !aiStatus.ai_available && (
        <div className="banner banner-warn" role="note">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>
            No Claude API key is configured, so plans come from a simple template and are clearly labelled as <strong>not AI-generated</strong>.
            See the README to enable Claude.
          </span>
        </div>
      )}

      <section className="card" aria-labelledby="planner-form-title">
        <h2 id="planner-form-title" className="card-title">Tell us about your goal</h2>
        {formError && !Object.keys(errors).length && <div className="banner banner-danger" role="alert">{formError}</div>}
        <form onSubmit={handleGenerate} noValidate>
          <Field label="What is your goal?" htmlFor="plan-goal" error={errors.goal} required>
            <input id="plan-goal" className="input" maxLength={220} value={form.goal} onChange={setField("goal")} placeholder="e.g. Learn the basics of Python" aria-invalid={Boolean(errors.goal)} />
          </Field>
          <div className="form-grid three">
            <Field label="Available time (hours / week)" htmlFor="plan-hours" error={errors.hours_per_week}>
              <input id="plan-hours" inputMode="decimal" className="input" value={form.hours_per_week} onChange={setField("hours_per_week")} />
            </Field>
            <Field label="Current skill level" htmlFor="plan-skill" error={errors.skill_level}>
              <select id="plan-skill" className="select" value={form.skill_level} onChange={setField("skill_level")}>
                {SKILL_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Target deadline" htmlFor="plan-deadline" error={errors.deadline}>
              <input id="plan-deadline" type="date" className="input" min={toISODate(new Date())} value={form.deadline} onChange={setField("deadline")} />
            </Field>
          </div>
          <Field label="Anything else the planner should know?" htmlFor="plan-notes" error={errors.notes} hint="Optional - for example exam topics, tools you have, or past struggles.">
            <textarea id="plan-notes" className="textarea" rows={2} maxLength={500} value={form.notes} onChange={setField("notes")} />
          </Field>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={generating}>
              <Sparkles size={17} aria-hidden="true" /> {generating ? "Generating plan..." : "Generate plan"}
            </button>
          </div>
        </form>
        {aiStatus?.ai_available && (
          <p className="hint">Your goal text is sent to Claude (Anthropic) to create the plan. Do not enter sensitive personal information.</p>
        )}
      </section>

      {generating && <LoadingSpinner block label="Building your plan - this can take up to a minute..." />}

      {result && plan && !generating && (
        <>
          {result.ai_generated ? (
            <div className="banner banner-ai" role="note">
              <Sparkles size={18} aria-hidden="true" />
              <span><strong>AI-generated plan</strong> by Claude ({result.model}). AI can make mistakes - review and edit everything before saving.</span>
            </div>
          ) : (
            <div className="banner banner-warn" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <span><strong>Not AI-generated.</strong> {result.notice}</span>
            </div>
          )}

          <section className="card" aria-labelledby="plan-overview-title">
            <h2 id="plan-overview-title" className="card-title">Goal overview</h2>
            <p>{plan.goal_description}</p>
            {plan.action_plan.length > 0 && (
              <>
                <h3 className="subheading"><ListOrdered size={17} aria-hidden="true" /> Action plan</h3>
                <ol className="steps">
                  {plan.action_plan.map((step, i) => <li key={i}>{step.replace(/^Step\s*\d+\s*[:.-]\s*/i, "")}</li>)}
                </ol>
              </>
            )}
          </section>

          <section className="card" aria-labelledby="plan-missions-title">
            <div className="row-between wrap">
              <h2 id="plan-missions-title" className="card-title">Missions ({missions.length})</h2>
              <span className="muted small">Total estimated time: {formatMinutes(totalMinutes) || "-"}</span>
            </div>
            <p className="hint">Everything below is editable. Remove missions you do not want before saving.</p>
            <ul className="plan-missions">
              {missions.map((m, index) => (
                <li key={m.key} className="plan-mission">
                  <span className="plan-index" aria-hidden="true">{index + 1}</span>
                  <div className="plan-fields">
                    <label className="sr-only" htmlFor={`pm-title-${m.key}`}>Mission {index + 1} title</label>
                    <input id={`pm-title-${m.key}`} className="input" value={m.title} onChange={(e) => updateMission(m.key, "title", e.target.value)} maxLength={200} />
                    <label className="sr-only" htmlFor={`pm-desc-${m.key}`}>Mission {index + 1} description</label>
                    <textarea id={`pm-desc-${m.key}`} className="textarea" rows={2} value={m.description} onChange={(e) => updateMission(m.key, "description", e.target.value)} />
                    <div className="plan-row">
                      <label className="mini-field">Minutes
                        <input className="input" inputMode="numeric" value={m.estimated_minutes} onChange={(e) => updateMission(m.key, "estimated_minutes", e.target.value)} />
                      </label>
                      <label className="mini-field">Due date
                        <input type="date" className="input" value={m.due_date} onChange={(e) => updateMission(m.key, "due_date", e.target.value)} />
                      </label>
                      <label className="mini-field">Priority
                        <select className="select" value={m.priority} onChange={(e) => updateMission(m.key, "priority", e.target.value)}>
                          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                  <button className="icon-btn danger" onClick={() => removeMission(m.key)} aria-label={`Remove mission ${index + 1}`}>
                    <Trash2 size={17} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {(plan.obstacles.length > 0 || plan.motivation) && (
            <div className="grid-2">
              {plan.obstacles.length > 0 && (
                <section className="card" aria-labelledby="obstacles-title">
                  <h2 id="obstacles-title" className="card-title"><AlertTriangle size={18} aria-hidden="true" /> Possible obstacles</h2>
                  <ul className="obstacle-list">
                    {plan.obstacles.map((o, i) => (
                      <li key={i}>
                        <strong>{o.obstacle}</strong>
                        {o.solution && <p><Lightbulb size={15} aria-hidden="true" /> {o.solution}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {plan.motivation && (
                <section className="card motivation-card" aria-labelledby="motivation-title">
                  <h2 id="motivation-title" className="card-title"><Sparkles size={18} aria-hidden="true" /> Motivation</h2>
                  <p>{plan.motivation}</p>
                </section>
              )}
            </div>
          )}

          <section className="card" aria-labelledby="save-title">
            <h2 id="save-title" className="card-title"><Save size={18} aria-hidden="true" /> Save to your account</h2>
            <div className="radio-row" role="radiogroup" aria-label="Where to save the missions">
              <label><input type="radio" name="save-mode" checked={save.mode === "new"} onChange={() => setSave((s) => ({ ...s, mode: "new" }))} /> Create a new goal</label>
              <label>
                <input type="radio" name="save-mode" checked={save.mode === "existing"} onChange={() => setSave((s) => ({ ...s, mode: "existing" }))} disabled={existingGoals.length === 0} />{" "}
                Add to an existing goal
              </label>
            </div>

            {save.mode === "new" ? (
              <>
                <Field label="Goal title" htmlFor="save-title-input">
                  <input id="save-title-input" className="input" maxLength={200} value={save.title} onChange={(e) => setSave((s) => ({ ...s, title: e.target.value }))} />
                </Field>
                <Field label="Goal description" htmlFor="save-desc">
                  <textarea id="save-desc" className="textarea" rows={2} value={save.description} onChange={(e) => setSave((s) => ({ ...s, description: e.target.value }))} />
                </Field>
                <div className="form-grid">
                  <Field label="Category" htmlFor="save-category">
                    <select id="save-category" className="select" value={save.category} onChange={(e) => setSave((s) => ({ ...s, category: e.target.value }))}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Priority" htmlFor="save-priority">
                    <select id="save-priority" className="select" value={save.priority} onChange={(e) => setSave((s) => ({ ...s, priority: e.target.value }))}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </Field>
                </div>
                <p className="hint">The goal's target date will be your deadline ({result.request.deadline}).</p>
              </>
            ) : (
              <Field label="Goal" htmlFor="save-existing">
                <select id="save-existing" className="select" value={save.goalId} onChange={(e) => setSave((s) => ({ ...s, goalId: e.target.value }))}>
                  {existingGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </Field>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || missions.length === 0}>
                {saving ? "Saving..." : `Save ${missions.length} mission${missions.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

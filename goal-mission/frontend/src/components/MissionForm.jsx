import { useState } from "react";
import Field from "./Field";
import { ApiError } from "../api/client";
import { PRIORITIES } from "../utils/constants";

// Create / edit form for missions.
export default function MissionForm({ initial, onSubmit, onCancel, submitLabel = "Save mission" }) {
  const [values, setValues] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    priority: initial?.priority || "medium",
    due_date: initial?.due_date || "",
    estimated_minutes: initial?.estimated_minutes ?? "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!values.title.trim()) found.title = "Title is required.";
    const minutes = values.estimated_minutes;
    if (minutes !== "" && (!/^\d+$/.test(String(minutes)) || Number(minutes) < 1 || Number(minutes) > 1440)) {
      found.estimated_minutes = "Enter whole minutes between 1 and 1440.";
    }
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await onSubmit({
        ...values,
        due_date: values.due_date || null,
        estimated_minutes: minutes === "" ? null : Number(minutes),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details || {});
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && !Object.keys(errors).length && <div className="banner banner-danger" role="alert">{formError}</div>}
      <Field label="Mission title" htmlFor="mission-title" error={errors.title} required>
        <input
          id="mission-title"
          className="input"
          value={values.title}
          onChange={set("title")}
          maxLength={220}
          placeholder="e.g. Finish chapter 3 notes"
          aria-invalid={Boolean(errors.title)}
          autoFocus
        />
      </Field>
      <Field label="Description" htmlFor="mission-description" error={errors.description}>
        <textarea
          id="mission-description"
          className="textarea"
          rows={3}
          value={values.description}
          onChange={set("description")}
        />
      </Field>
      <div className="form-grid">
        <Field label="Priority" htmlFor="mission-priority" error={errors.priority}>
          <select id="mission-priority" className="select" value={values.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Due date" htmlFor="mission-due" error={errors.due_date}>
          <input id="mission-due" type="date" className="input" value={values.due_date} onChange={set("due_date")} />
        </Field>
      </div>
      <Field label="Estimated time (minutes)" htmlFor="mission-minutes" error={errors.estimated_minutes} hint="Optional">
        <input
          id="mission-minutes"
          inputMode="numeric"
          className="input"
          value={values.estimated_minutes}
          onChange={set("estimated_minutes")}
          placeholder="e.g. 45"
        />
      </Field>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

import { useState } from "react";
import Field from "./Field";
import { ApiError } from "../api/client";
import { CATEGORIES, PRIORITIES } from "../utils/constants";
import { todayISO } from "../utils/format";

// Create / edit form for goals. Shows both client-side and server-side validation errors.
export default function GoalForm({ initial, onSubmit, onCancel, submitLabel = "Save goal" }) {
  const [values, setValues] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    category: initial?.category || "Learning",
    priority: initial?.priority || "medium",
    target_date: initial?.target_date || "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(initial);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!values.title.trim()) found.title = "Title is required.";
    if (values.title.length > 200) found.title = "Title must be at most 200 characters.";
    if (!isEdit && values.target_date && values.target_date < todayISO()) {
      found.target_date = "Target date cannot be in the past.";
    }
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await onSubmit({ ...values, target_date: values.target_date || null });
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
      <Field label="Goal title" htmlFor="goal-title" error={errors.title} required>
        <input
          id="goal-title"
          className="input"
          value={values.title}
          onChange={set("title")}
          maxLength={220}
          placeholder="e.g. Prepare for my final exams"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "goal-title-error" : undefined}
          autoFocus
        />
      </Field>
      <Field label="Description" htmlFor="goal-description" error={errors.description}>
        <textarea
          id="goal-description"
          className="textarea"
          rows={3}
          value={values.description}
          onChange={set("description")}
          placeholder="What do you want to achieve and why?"
        />
      </Field>
      <div className="form-grid">
        <Field label="Category" htmlFor="goal-category" error={errors.category}>
          <select id="goal-category" className="select" value={values.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority" htmlFor="goal-priority" error={errors.priority}>
          <select id="goal-priority" className="select" value={values.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Target date" htmlFor="goal-target" error={errors.target_date} hint="Optional, but deadlines power reminders.">
        <input
          id="goal-target"
          type="date"
          className="input"
          value={values.target_date}
          onChange={set("target_date")}
          min={isEdit ? undefined : todayISO()}
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

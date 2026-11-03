import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Register() {
  useDocumentTitle("Create account");
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const validate = () => {
    const found = {};
    if (values.name.trim().length < 2) found.name = "Name must be at least 2 characters.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) found.email = "Enter a valid email address.";
    if (values.password.length < 8) found.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) found.password = "Use at least one letter and one number.";
    if (values.confirm !== values.password) found.confirm = "Passwords do not match.";
    return found;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await register({ name: values.name, email: values.email, password: values.password });
      toast.success("Account created. Welcome to Goal Mission!");
      navigate("/", { replace: true });
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
    <AuthLayout
      title="Create your account"
      subtitle="Start turning goals into missions."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      {formError && <div className="banner banner-danger" role="alert">{formError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Full name" htmlFor="reg-name" error={errors.name}>
          <input id="reg-name" className="input" autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Email" htmlFor="reg-email" error={errors.email}>
          <input id="reg-email" type="email" className="input" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Password" htmlFor="reg-password" error={errors.password} hint="At least 8 characters with a letter and a number.">
          <input id="reg-password" type="password" className="input" autoComplete="new-password" value={values.password} onChange={set("password")} aria-invalid={Boolean(errors.password)} />
        </Field>
        <Field label="Confirm password" htmlFor="reg-confirm" error={errors.confirm}>
          <input id="reg-confirm" type="password" className="input" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} aria-invalid={Boolean(errors.confirm)} />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

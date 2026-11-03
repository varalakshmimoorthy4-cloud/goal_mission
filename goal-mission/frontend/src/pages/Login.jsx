import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Login() {
  useDocumentTitle("Log in");
  const { login, startDemo } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!values.email.trim()) found.email = "Enter your email address.";
    if (!values.password) found.password = "Enter your password.";
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await login(values.email, values.password);
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

  const handleDemo = async () => {
    setBusy(true);
    setFormError("");
    try {
      await startDemo();
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err.message || "Could not start demo mode.");
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your missions."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      {formError && <div className="banner banner-danger" role="alert">{formError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Email" htmlFor="login-email" error={errors.email}>
          <input id="login-email" type="email" className="input" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Password" htmlFor="login-password" error={errors.password}>
          <input id="login-password" type="password" className="input" autoComplete="current-password" value={values.password} onChange={set("password")} aria-invalid={Boolean(errors.password)} />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Please wait..." : "Log in"}
        </button>
      </form>

      <div className="divider"><span>or</span></div>
      <button className="btn btn-secondary btn-block" onClick={handleDemo} disabled={busy}>
        <FlaskConical size={17} aria-hidden="true" /> Try demo mode
      </button>
      <p className="hint center">Demo mode opens a temporary account filled with clearly labelled sample data.</p>
    </AuthLayout>
  );
}

import { useState } from "react";
import { KeyRound, LogOut, Settings2, UserRound } from "lucide-react";
import { api, ApiError, setToken } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import Field from "../components/Field";

export default function Profile() {
  useDocumentTitle("Profile & Settings");
  const { user, setUser, logout } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: user.name, email: user.email });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [prefs, setPrefs] = useState({
    daily_focus_minutes: String(user.preferences.daily_focus_minutes),
    reminder_days: String(user.preferences.reminder_days),
    weekly_mission_target: String(user.preferences.weekly_mission_target),
  });
  const [prefErrors, setPrefErrors] = useState({});
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    const found = {};
    if (profile.name.trim().length < 2) found.name = "Name must be at least 2 characters.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email.trim())) found.email = "Enter a valid email address.";
    setProfileErrors(found);
    if (Object.keys(found).length) return;
    setSavingProfile(true);
    try {
      const data = await api.auth.updateProfile({ name: profile.name, email: profile.email });
      setUser(data.user);
      toast.success("Profile updated.");
    } catch (err) {
      if (err instanceof ApiError) setProfileErrors(err.details && Object.keys(err.details).length ? err.details : { name: err.message });
      else toast.error("Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async (event) => {
    event.preventDefault();
    const ranges = {
      daily_focus_minutes: [15, 960, "Enter minutes between 15 and 960."],
      reminder_days: [0, 30, "Enter days between 0 and 30."],
      weekly_mission_target: [1, 100, "Enter a target between 1 and 100."],
    };
    const found = {};
    const numbers = {};
    Object.entries(ranges).forEach(([key, [low, high, message]]) => {
      const raw = prefs[key];
      const value = Number(raw);
      if (raw === "" || !Number.isInteger(value) || value < low || value > high) found[key] = message;
      else numbers[key] = value;
    });
    setPrefErrors(found);
    if (Object.keys(found).length) return;
    setSavingPrefs(true);
    try {
      const data = await api.auth.updateProfile({ preferences: numbers });
      setUser(data.user);
      toast.success("Preferences saved.");
    } catch (err) {
      if (err instanceof ApiError && err.details) setPrefErrors(err.details);
      else toast.error("Could not save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const found = {};
    if (!pw.current_password) found.current_password = "Enter your current password.";
    if (pw.new_password.length < 8) found.new_password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(pw.new_password) || !/\d/.test(pw.new_password)) found.new_password = "Use at least one letter and one number.";
    if (pw.confirm !== pw.new_password) found.confirm = "Passwords do not match.";
    setPwErrors(found);
    if (Object.keys(found).length) return;
    setSavingPw(true);
    try {
      const data = await api.auth.changePassword({ current_password: pw.current_password, new_password: pw.new_password });
      setToken(data.token); // the old token stops working after a password change
      setPw({ current_password: "", new_password: "", confirm: "" });
      toast.success("Password changed.");
    } catch (err) {
      if (err instanceof ApiError) setPwErrors(err.details && Object.keys(err.details).length ? err.details : { current_password: err.message });
      else toast.error("Could not change your password.");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Profile &amp; Settings</h1>
          <p className="page-sub">Manage your account and productivity preferences.</p>
        </div>
        <button className="btn btn-secondary" onClick={logout}><LogOut size={16} aria-hidden="true" /> Log out</button>
      </div>

      {user.is_demo && (
        <div className="banner banner-info" role="note">
          This is a temporary demo account with sample data. It is deleted automatically after about 24 hours, and its password is random, so you cannot log in again later.
        </div>
      )}

      <div className="grid-2">
        <section className="card" aria-labelledby="profile-title">
          <h2 id="profile-title" className="card-title"><UserRound size={18} aria-hidden="true" /> Profile</h2>
          <form onSubmit={saveProfile} noValidate>
            <Field label="Full name" htmlFor="pf-name" error={profileErrors.name}>
              <input id="pf-name" className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} autoComplete="name" />
            </Field>
            <Field label="Email" htmlFor="pf-email" error={profileErrors.email}>
              <input id="pf-email" type="email" className="input" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} autoComplete="email" />
            </Field>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={savingProfile}>{savingProfile ? "Saving..." : "Save profile"}</button>
            </div>
          </form>
        </section>

        <section className="card" aria-labelledby="prefs-title">
          <h2 id="prefs-title" className="card-title"><Settings2 size={18} aria-hidden="true" /> Productivity preferences</h2>
          <form onSubmit={savePrefs} noValidate>
            <Field label="Daily focus time (minutes)" htmlFor="pr-focus" error={prefErrors.daily_focus_minutes} hint="How much time you aim to spend on your goals each day.">
              <input id="pr-focus" inputMode="numeric" className="input" value={prefs.daily_focus_minutes} onChange={(e) => setPrefs((p) => ({ ...p, daily_focus_minutes: e.target.value }))} />
            </Field>
            <Field label="Reminder window (days before due)" htmlFor="pr-remind" error={prefErrors.reminder_days} hint="Missions due within this many days appear as in-app reminders.">
              <input id="pr-remind" inputMode="numeric" className="input" value={prefs.reminder_days} onChange={(e) => setPrefs((p) => ({ ...p, reminder_days: e.target.value }))} />
            </Field>
            <Field label="Weekly mission target" htmlFor="pr-target" error={prefErrors.weekly_mission_target} hint="Shown on your dashboard.">
              <input id="pr-target" inputMode="numeric" className="input" value={prefs.weekly_mission_target} onChange={(e) => setPrefs((p) => ({ ...p, weekly_mission_target: e.target.value }))} />
            </Field>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={savingPrefs}>{savingPrefs ? "Saving..." : "Save preferences"}</button>
            </div>
          </form>
        </section>
      </div>

      {!user.is_demo && (
        <section className="card" aria-labelledby="pw-title">
          <h2 id="pw-title" className="card-title"><KeyRound size={18} aria-hidden="true" /> Change password</h2>
          <form onSubmit={changePassword} noValidate className="narrow-form">
            <Field label="Current password" htmlFor="pw-current" error={pwErrors.current_password}>
              <input id="pw-current" type="password" className="input" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} />
            </Field>
            <Field label="New password" htmlFor="pw-new" error={pwErrors.new_password} hint="At least 8 characters with a letter and a number.">
              <input id="pw-new" type="password" className="input" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} />
            </Field>
            <Field label="Confirm new password" htmlFor="pw-confirm" error={pwErrors.confirm}>
              <input id="pw-confirm" type="password" className="input" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            </Field>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={savingPw}>{savingPw ? "Updating..." : "Change password"}</button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}

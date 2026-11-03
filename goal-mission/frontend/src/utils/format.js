// Date helpers. Backend dates are plain "YYYY-MM-DD" strings (no timezone), so we
// parse them as LOCAL dates to avoid off-by-one-day bugs.

export function parseLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const todayISO = () => toISODate(new Date());

export function formatDate(iso) {
  const date = parseLocalDate(iso);
  if (!date) return "No date";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatMinutes(minutes) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// "Due today", "Due in 3 days", "2 days overdue" ...
export function dueLabel(daysUntil, completed = false) {
  if (daysUntil === null || daysUntil === undefined) return "No due date";
  if (completed) return "Done";
  if (daysUntil < 0) {
    const n = Math.abs(daysUntil);
    return `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil} days`;
}

export function timeAgo(isoTimestamp) {
  if (!isoTimestamp) return "";
  const seconds = Math.max(0, (Date.now() - new Date(isoTimestamp).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(isoTimestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : "");

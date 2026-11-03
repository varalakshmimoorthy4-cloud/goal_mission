import { NavLink } from "react-router-dom";
import { CalendarDays, LayoutDashboard, LogOut, MessageCircle, Sparkles, Target, UserCog, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/goals", label: "My Goals", icon: Target },
  { to: "/planner", label: "AI Goal Planner", icon: Sparkles },
  { to: "/chat", label: "Motivation Assistant", icon: MessageCircle },
  { to: "/calendar", label: "Calendar & Deadlines", icon: CalendarDays },
  { to: "/profile", label: "Profile & Settings", icon: UserCog },
];

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth();
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            <Target size={20} />
          </span>
          <span className="brand-name">Goal Mission</span>
          <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav>
          <ul className="nav-list">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} onClick={onClose}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link nav-button" onClick={logout}>
            <LogOut size={19} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

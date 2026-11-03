import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={22} />
      </button>
      <span className="topbar-brand">Goal Mission</span>
      <Link to="/profile" className="user-chip" aria-label="Open profile and settings">
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="user-name">{user.name}</span>
      </Link>
    </header>
  );
}

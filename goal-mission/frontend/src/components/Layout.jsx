import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";

// Shell for all signed-in pages: sidebar + top bar + routed content.
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Close the mobile menu and jump back to the top whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        {user.is_demo && (
          <div className="demo-banner" role="note">
            <FlaskConical size={16} aria-hidden="true" />
            <span>
              <strong>Demo mode:</strong> you are exploring clearly labelled sample data in a temporary account.
              Create a real account to keep your own goals.
            </span>
          </div>
        )}
        <main id="main-content" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

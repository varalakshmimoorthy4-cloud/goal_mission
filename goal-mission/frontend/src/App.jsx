import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import GoalDetails from "./pages/GoalDetails";
import MissionDetails from "./pages/MissionDetails";
import AIPlanner from "./pages/AIPlanner";
import AIChat from "./pages/AIChat";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";

// Signed-in pages only: redirect to /login when there is no session.
function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner block label="Loading your workspace..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

// Login / register pages: signed-in users go straight to the dashboard.
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner block label="Loading..." />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

            <Route element={<ProtectedLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="goals" element={<Goals />} />
              <Route path="goals/:goalId" element={<GoalDetails />} />
              <Route path="missions/:missionId" element={<MissionDetails />} />
              <Route path="planner" element={<AIPlanner />} />
              <Route path="chat" element={<AIChat />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

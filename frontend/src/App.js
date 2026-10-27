import Login from "./pages/Login";
import Register from "./pages/Register";
import HomeDashboard from "./dashboards/HomeDashboard";
import HomeAffairsDashboard from "./dashboards/HomeAffairsDashboard";
import HomeAffairsDashboardAdmin from "./admin/HomeAffairsDashboardAdmin";
import PassportOfficeDashboard from "./dashboards/PassportOfficeDashboard";
import PassportOfficeDashboardAdmin from "./admin/PassportOfficeDashboardAdmin";
import PoliceDashboard from "./dashboards/PoliceDashboard";
import PoliceDashboardAdmin from "./admin/PoliceDashboardAdmin";
import FinanceDashboard from "./dashboards/FinanceDashboard";
import FinanceDashboardAdmin from "./admin/FinanceDashboardAdmin";
import PensionsDashboard from "./dashboards/PensionsDashboard";
import PensionsDashboardAdmin from "./admin/PensionsDashboardAdmin";
import TrafficDashboard from "./dashboards/TrafficDashboard";
import TrafficDashboardAdmin from "./admin/TrafficDashboardAdmin";
import Help from "./pages/Help";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HelpButton from "./components/HelpButton";
import AccessibilityToolbar from "./components/AccessibilityToolbar";

import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

// ============================================================
// Protected Route Wrappers
// ============================================================
function RequireAccess({ isAuthenticated, children }) {
  const location = useLocation();
  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

function AdminRoute({ isAuthenticated, children }) {
  const location = useLocation();
  const isAdmin = sessionStorage.getItem("is-admin") === "true";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/home-affairs-dashboard" replace />;
  }
  return children;
}

// ============================================================
// Post-auth route resolution
// ============================================================
const MINISTRY_ROUTES = {
  "home-affairs": "/home-affairs-dashboard",
  passport: "/passport-office-dashboard",
  traffic: "/traffic-dashboard",
  finance: "/finance-dashboard",
  pensions: "/pensions-dashboard",
  police: "/police-dashboard"
};

function getPostAuthRoute() {
  const isAdmin = sessionStorage.getItem("is-admin") === "true";
  if (isAdmin) return "/admin/home-affairs";

  const selected = sessionStorage.getItem("selected-ministry");
  if (selected && MINISTRY_ROUTES[selected]) {
    return MINISTRY_ROUTES[selected];
  }
  return "/home-affairs-dashboard";
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem("home-affairs-authenticated") === "true"
  );
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timeoutId = window.setTimeout(() => setStatusMessage(""), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  const handleAuthenticationSuccess = (firstName) => {
    sessionStorage.setItem("home-affairs-authenticated", "true");
    setIsAuthenticated(true);
    if (firstName) {
      setStatusMessage(`Welcome back, ${firstName}. Your dashboard is ready.`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("home-affairs-authenticated");
    sessionStorage.removeItem("firebase-uid");
    sessionStorage.removeItem("account-type");
    sessionStorage.removeItem("user-profile");
    sessionStorage.removeItem("selected-ministry");
    sessionStorage.removeItem("is-admin");
    setIsAuthenticated(false);
    setStatusMessage("You’ve been logged out. We hope to see you again soon.");
  };

  return (
    <BrowserRouter>
      <div style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh"
      }}>
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2000,
              width: "max-content",
              maxWidth: "calc(100% - 32px)",
              boxSizing: "border-box",
              padding: "14px 20px",
              borderRadius: 8,
              background: "#e6f6ee",
              border: "1px solid #009543",
              color: "#14532d",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)",
              textAlign: "center",
              fontSize: 15,
              fontWeight: 600
            }}
          >
            {statusMessage}
          </div>
        )}
        <AccessibilityToolbar />
        <Navbar
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
        />

        <div className="dashboard-route-container" style={{ flexGrow: 1 }}>
          <Routes>
            {/* PUBLIC */}
            <Route
              path="/"
              element={<HomeDashboard isAuthenticated={isAuthenticated} />}
            />
            <Route path="/help" element={<Help />} />

            {/* AUTH */}
            <Route
              path="/login"
              element={
                <Login
                  onSuccess={handleAuthenticationSuccess}
                  getPostAuthRoute={getPostAuthRoute}
                />
              }
            />
            <Route
              path="/register"
              element={
                <Register
                  onSuccess={handleAuthenticationSuccess}
                  getPostAuthRoute={getPostAuthRoute}
                />
              }
            />

            {/* CITIZEN */}
            <Route
              path="/home-affairs-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <HomeAffairsDashboard onLogout={handleLogout} />
                </RequireAccess>
              }
            />
            <Route
              path="/passport-office-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <PassportOfficeDashboard onLogout={handleLogout} />
                </RequireAccess>
              }
            />
            <Route
              path="/pensions-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <PensionsDashboard onLogout={handleLogout} />
                </RequireAccess>
              }
            />
            <Route
              path="/police-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <PoliceDashboard onLogout={handleLogout} />
                </RequireAccess>
              }
            />
            <Route
              path="/traffic-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <TrafficDashboard onLogout={handleLogout} />
                </RequireAccess>
              }
            />
            <Route
              path="/finance-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <FinanceDashboard onLogout={handleLogout} />
                </RequireAccess>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin/home-affairs"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <HomeAffairsDashboardAdmin onLogout={handleLogout} />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/passport"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <PassportOfficeDashboardAdmin onLogout={handleLogout} />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/police"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <PoliceDashboardAdmin onLogout={handleLogout} />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/finance"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <FinanceDashboardAdmin onLogout={handleLogout} />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/pensions"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <PensionsDashboardAdmin onLogout={handleLogout} />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/traffic"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <TrafficDashboardAdmin onLogout={handleLogout} />
                </AdminRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer className="site-footer" />
        <HelpButton />
      </div>
    </BrowserRouter>
  );
}

export default App;
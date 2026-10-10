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

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import { useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  Link
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
// Admin sub-navigation
// ============================================================
function AdminSubNav() {
  const location = useLocation();
  const isHomeAffairs = location.pathname.startsWith("/admin/home-affairs");
  const isPassport = location.pathname.startsWith("/admin/passport");
  const isPolice = location.pathname.startsWith("/admin/police");
  const isFinance = location.pathname.startsWith("/admin/finance");
  const isPensions = location.pathname.startsWith("/admin/pensions");
  const isTraffic = location.pathname.startsWith("/admin/traffic");

  const linkStyle = (active) => ({
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
    color: active ? "#175cd3" : "#475569",
    borderBottom: active ? "3px solid #175cd3" : "3px solid transparent",
    fontFamily: "inherit"
  });

  return (
    <div style={{
      background: "#fff",
      borderBottom: "1px solid #e2e8f0",
      padding: "0 24px",
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }}>
      <Link to="/admin/home-affairs" style={linkStyle(isHomeAffairs)}>
        Home Affairs Admin
      </Link>
      <Link to="/admin/passport" style={linkStyle(isPassport)}>
        Passport Admin
      </Link>
      <Link to="/admin/police" style={linkStyle(isPolice)}>
        Police Admin
      </Link>
      <Link to="/admin/finance" style={linkStyle(isFinance)}>
        Finance Admin
      </Link>
      <Link to="/admin/pensions" style={linkStyle(isPensions)}>
        Pensions Admin
      </Link>
      <Link to="/admin/traffic" style={linkStyle(isTraffic)}>
        Traffic Admin
      </Link>
    </div>
  );
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
  const isAdmin = sessionStorage.getItem("is-admin") === "true";

  const handleAuthenticationSuccess = () => {
    sessionStorage.setItem("home-affairs-authenticated", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("home-affairs-authenticated");
    sessionStorage.removeItem("firebase-uid");
    sessionStorage.removeItem("account-type");
    sessionStorage.removeItem("user-profile");
    sessionStorage.removeItem("selected-ministry");
    sessionStorage.removeItem("is-admin");
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <div style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh"
      }}>
        <Navbar
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
        />

        {/* Admin-only sub-nav so the single admin can move between offices */}
        {isAuthenticated && isAdmin && <AdminSubNav />}

        <div style={{ flexGrow: 1 }}>
          <Routes>
            {/* PUBLIC */}
            <Route
              path="/"
              element={<HomeDashboard isAuthenticated={isAuthenticated} />}
            />

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
                  <HomeAffairsDashboard />
                </RequireAccess>
              }
            />
            <Route
              path="/passport-office-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <PassportOfficeDashboard />
                </RequireAccess>
              }
            />
            <Route
              path="/pensions-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <PensionsDashboard />
                </RequireAccess>
              }
            />
            <Route
              path="/police-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <PoliceDashboard />
                </RequireAccess>
              }
            />
            <Route
              path="/traffic-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <TrafficDashboard />
                </RequireAccess>
              }
            />
            <Route
              path="/finance-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <FinanceDashboard />
                </RequireAccess>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin/home-affairs"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <HomeAffairsDashboardAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/passport"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <PassportOfficeDashboardAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/police"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <PoliceDashboardAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/finance"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <FinanceDashboardAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/pensions"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <PensionsDashboardAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/traffic"
              element={
                <AdminRoute isAuthenticated={isAuthenticated}>
                  <TrafficDashboardAdmin />
                </AdminRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
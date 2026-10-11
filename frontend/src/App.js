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

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
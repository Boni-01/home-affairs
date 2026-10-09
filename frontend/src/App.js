import Login from "./pages/Login";
import Register from "./pages/Register";
import HomeDashboard from "./dashboards/HomeDashboard";
import HomeAffairsDashboard from "./dashboards/HomeAffairsDashboard";
import HomeAffairsDashboardAdmin from "./admin/HomeAffairsDashboardAdmin";
import PassportOfficeDashboard from "./dashboards/PassportOfficeDashboard";
import PensionsDashboard from "./dashboards/PensionsDashboard";
import PoliceDashboard from "./dashboards/PoliceDashboard";
import TrafficDashboard from "./dashboards/TrafficDashboard";
import FinanceDashboard from "./dashboards/FinanceDashboard";

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
// Protected Route Wrapper
// ============================================================
function RequireAccess({ isAuthenticated, children }) {
  const location = useLocation();
  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

// ============================================================
// Post-auth route resolution
// Admins → /admin/home-affairs
// Citizens → their selected ministry or default dashboard
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
  // Admin always goes to the admin dashboard
  const isAdmin = sessionStorage.getItem("is-admin") === "true";
  if (isAdmin) return "/admin/home-affairs";

  // Citizen goes to their selected ministry
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
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <HomeAffairsDashboardAdmin />
                </RequireAccess>
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
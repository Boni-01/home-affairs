import Login from "./pages/Login";
import Register from "./pages/Register";
import HomeDashboard from "./dashboards/HomeDashboard";
import HomeAffairsDashboard from "./dashboards/HomeAffairsDashboard";
import PassportOfficeDashboard from "./dashboards/PassportOfficeDashboard";
import PensionsDashboard from "./dashboards/PensionsDashboard";
import PoliceDashboard from "./dashboards/PoliceDashboard";
import TrafficDashboard from "./dashboards/TrafficDashboard";
import FinanceDashboard from "./dashboards/FinanceDashboard";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

function RequireAccess({ isAuthenticated, children }) {
  const location = useLocation();
  return isAuthenticated
    ? children
    : <Navigate to="/login" replace state={{ from: location }} />;
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
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <div style={{ flexGrow: 1 }}>
          <Routes>
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? "/home-dashboard" : "/login"} replace />}
            />
            <Route
              path="/login"
              element={<Login onSuccess={handleAuthenticationSuccess} />}
            />
            <Route
              path="/register"
              element={<Register onSuccess={handleAuthenticationSuccess} />}
            />
            <Route
              path="/home-dashboard"
              element={
                <RequireAccess isAuthenticated={isAuthenticated}>
                  <HomeDashboard />
                </RequireAccess>
              }
            />
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
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
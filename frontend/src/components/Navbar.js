import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import flagImage from "../Flag.png"; // Adjust path if Flag.png is in a subfolder (e.g., "./assets/Flag.png")
import "./Navbar.css";

function Navbar({ isAuthenticated, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem("home-affairs-authenticated");
    sessionStorage.removeItem("firebase-uid");
    sessionStorage.removeItem("account-type");
    sessionStorage.removeItem("user-profile");
    sessionStorage.removeItem("selected-ministry");

    if (onLogout) onLogout();
    navigate("/");
    setMobileOpen(false);
  };

  const handleNavClick = () => setMobileOpen(false);
  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      {/* Lesotho flag stripe */}
      <div className="flag-stripe">
        <div className="flag-blue" />
        <div className="flag-white" />
        <div className="flag-green" />
      </div>

      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={handleNavClick}>
          <img 
            src={flagImage} 
            alt="Kingdom of Lesotho Flag" 
            className="logo-flag-img" 
          />
          <span className="logo-text">
            <span className="logo-title">Home Affairs</span>
            <span className="logo-subtitle">Kingdom of Lesotho</span>
          </span>
        </Link>

        {/* Mobile toggle */}
        <button
          className="navbar-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        {/* Nav links */}
        <nav className={`navbar-nav ${mobileOpen ? "open" : ""}`}>
          {isAuthenticated ? (
            <>
              <ul className="nav-links">
                <li>
                  <Link
                    to="/home-affairs-dashboard"
                    className={`nav-link ${isActive("/home-affairs-dashboard") ? "active" : ""}`}
                    onClick={handleNavClick}
                  >
                    Home Affairs
                  </Link>
                </li>
                <li>
                  <Link
                    to="/passport-office-dashboard"
                    className={`nav-link ${isActive("/passport-office-dashboard") ? "active" : ""}`}
                    onClick={handleNavClick}
                  >
                    Passport
                  </Link>
                </li>
                <li>
                  <Link
                    to="/police-dashboard"
                    className={`nav-link ${isActive("/police-dashboard") ? "active" : ""}`}
                    onClick={handleNavClick}
                  >
                    Police
                  </Link>
                </li>
                <li>
                  <Link
                    to="/finance-dashboard"
                    className={`nav-link ${isActive("/finance-dashboard") ? "active" : ""}`}
                    onClick={handleNavClick}
                  >
                    Finance
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pensions-dashboard"
                    className={`nav-link ${isActive("/pensions-dashboard") ? "active" : ""}`}
                    onClick={handleNavClick}
                  >
                    Pensions
                  </Link>
                </li>
                <li>
                  <Link
                    to="/traffic-dashboard"
                    className={`nav-link ${isActive("/traffic-dashboard") ? "active" : ""}`}
                    onClick={handleNavClick}
                  >
                    Traffic
                  </Link>
                </li>
              </ul>

              <div className="nav-actions">
                <button
                  onClick={handleLogout}
                  className="btn-logout"
                  aria-label="Log out"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <ul className="nav-links">
              <li>
                <Link
                  to="/login"
                  className={`nav-link ${isActive("/login") ? "active" : ""}`}
                  onClick={handleNavClick}
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="nav-link nav-link-cta"
                  onClick={handleNavClick}
                >
                  Register
                </Link>
              </li>
            </ul>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
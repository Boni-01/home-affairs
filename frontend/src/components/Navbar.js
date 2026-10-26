import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import flagImage from "./Flag.png";
import DashboardSettingsModal from "./DashboardSettingsModal";
import "./Navbar.css";

const ministries = [
  { label: "Home Affairs", route: "/home-affairs-dashboard" },
  { label: "Passport", route: "/passport-office-dashboard" },
  { label: "Police", route: "/police-dashboard" },
  { label: "Finance", route: "/finance-dashboard" },
  { label: "Pensions", route: "/pensions-dashboard" },
  { label: "Traffic", route: "/traffic-dashboard" }
];

const adminOffices = [
  { label: "Home Affairs", route: "/admin/home-affairs" },
  { label: "Passport", route: "/admin/passport" },
  { label: "Police", route: "/admin/police" },
  { label: "Finance", route: "/admin/finance" },
  { label: "Pensions", route: "/admin/pensions" },
  { label: "Traffic", route: "/admin/traffic" }
];

const accountKeys = new Set(["profile", "mine", "applications", "requests", "notifications"]);
const SETTINGS_DASHBOARD_PATHS = new Set([
  "/finance-dashboard",
  "/police-dashboard",
  "/passport-office-dashboard",
  "/pensions-dashboard",
  "/traffic-dashboard"
]);

function readStoredProfile() {
  const storedProfile = sessionStorage.getItem("user-profile");
  if (!storedProfile) return null;
  try {
    return JSON.parse(storedProfile);
  } catch (error) {
    console.error("Unable to read the signed-in profile.", error);
    return null;
  }
}

function getUserInitials(profile) {
  const name = profile?.full_name || profile?.name || "";
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("");
  return initials.toUpperCase() || "U";
}

function Navbar({
  isAuthenticated,
  onLogout,
  items,
  activeTab,
  onTabChange,
  action,
  user,
  sectionNavigationClassName
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("applications");
  const [storedProfile] = useState(readStoredProfile);
  const [profileOverride, setProfileOverride] = useState(null);
  const isDashboard = items !== undefined;
  const authenticated = isAuthenticated ??
    (sessionStorage.getItem("home-affairs-authenticated") === "true");
  const isAdmin = location.pathname.startsWith("/admin/");
  const routes = isAdmin ? adminOffices : ministries;
  const dashboardItems = items || [];
  const profile = profileOverride || user || storedProfile;
  const isAccountItem = ([key]) =>
    isAdmin ? key === "notifications" : accountKeys.has(key);
  const accountItems = dashboardItems.filter(isAccountItem);
  const workflowItems = dashboardItems.filter(item => !isAccountItem(item));
  const applicationItems = accountItems.filter(([key]) =>
    ["mine", "applications", "requests"].includes(key)
  );
  const notificationItems = accountItems.filter(([key]) => key === "notifications");
  const hasProfileItem = accountItems.some(([key]) => key === "profile");
  const isProfileTabActive = accountItems.some(([key]) => key === activeTab);
  const logout = action?.onClick || onLogout;

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setSettingsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const openProfile = () => {
      setSettingsTab("profile");
      setSettingsOpen(true);
      setProfileOpen(false);
    };
    window.addEventListener("home-affairs-open-profile", openProfile);
    return () => window.removeEventListener("home-affairs-open-profile", openProfile);
  }, []);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const closeOnOutsideClick = event => {
      if (!navigationRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  const handleLogout = () => {
    sessionStorage.removeItem("home-affairs-authenticated");
    sessionStorage.removeItem("firebase-uid");
    sessionStorage.removeItem("account-type");
    sessionStorage.removeItem("user-profile");
    sessionStorage.removeItem("selected-ministry");
    sessionStorage.removeItem("is-admin");
    onLogout?.();
    navigate("/");
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const handleTabChange = key => {
    onTabChange?.(key);
    setProfileOpen(false);
    setMobileOpen(false);
  };

  const handleAccountMenuItemClick = key => {
    if (SETTINGS_DASHBOARD_PATHS.has(location.pathname)) {
      const nextSettingsTab = key === "profile"
        ? "profile"
        : applicationItems.some(([itemKey]) => itemKey === key)
          ? "applications"
          : notificationItems.some(([itemKey]) => itemKey === key)
            ? "notifications"
            : null;

      if (nextSettingsTab) {
        setSettingsTab(nextSettingsTab);
        setSettingsOpen(true);
        setProfileOpen(false);
        setMobileOpen(false);
        return;
      }
    }

    handleTabChange(key);
  };

  const isActive = path => location.pathname === path;
  const navClassName = [
    "navbar",
    isDashboard ? "navbar-dashboard" : "",
    mobileOpen ? "navbar-mobile-open" : ""
  ].filter(Boolean).join(" ");

  if (!isDashboard && (
    ["/home-affairs-dashboard", "/passport-office-dashboard", "/police-dashboard",
      "/finance-dashboard", "/pensions-dashboard", "/traffic-dashboard"].includes(location.pathname) ||
    isAdmin
  )) {
    return null;
  }

  return (
    <>
      <header className={navClassName} ref={navigationRef}>
        <div className="flag-stripe" aria-hidden="true">
          <div className="flag-blue" />
          <div className="flag-white" />
          <div className="flag-green" />
        </div>

        <div className="navbar-container">
          <Link to="/" className="navbar-logo" onClick={() => setMobileOpen(false)}>
            <img
              src={flagImage}
              alt="Kingdom of Lesotho Flag"
              className="logo-flag-img"
            />
            <span className="logo-text">
              <span className="logo-title">IDPSS</span>
              <span className="logo-subtitle">Kingdom of Lesotho</span>
            </span>
          </Link>

          <button
            type="button"
            className="navbar-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(open => !open)}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <nav className={`navbar-nav${mobileOpen ? " open" : ""}`} aria-label="Main navigation">
            {authenticated ? (
              <>
                <ul className="nav-links">
                  {routes.map(({ label, route }) => (
                    <li key={route}>
                      <Link
                        to={route}
                        className={`nav-link${isActive(route) ? " active" : ""}`}
                        aria-current={isActive(route) ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="nav-actions">
                  <div className="navbar-profile">
                    <button
                      type="button"
                      className={`navbar-profile-trigger${isProfileTabActive ? " active" : ""}`}
                      aria-expanded={profileOpen}
                      onClick={() => setProfileOpen(open => !open)}
                    >
                      <span className="navbar-profile-initials" aria-hidden="true">
                        {getUserInitials(profile)}
                      </span>
                    </button>
                    {profileOpen && (
                      <div className="navbar-profile-menu">
                        <div className="navbar-profile-details">
                          <strong>{profile?.full_name || profile?.name || "Account profile"}</strong>
                          {profile?.email && <span>{profile.email}</span>}
                          {(profile?.national_id_number || profile?.national_id) && (
                            <span>
                              National ID: {profile.national_id_number || profile.national_id}
                            </span>
                          )}
                          {profile?.phone && <span>Phone: {profile.phone}</span>}
                          {(profile?.account_type || profile?.role) && (
                            <span>Account: {profile.account_type || profile.role}</span>
                          )}
                        </div>
                        {hasProfileItem && (
                          <button
                            type="button"
                            className={activeTab === "profile" ? "active" : ""}
                            onClick={() => handleAccountMenuItemClick("profile")}
                          >
                            Profile details
                          </button>
                        )}
                        {applicationItems.map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            className={key === activeTab ? "active" : ""}
                            onClick={() => handleAccountMenuItemClick(key)}
                          >
                            {label}
                          </button>
                        ))}
                        {notificationItems.map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            className={key === activeTab ? "active" : ""}
                            onClick={() => handleAccountMenuItemClick(key)}
                          >
                            {label}
                          </button>
                        ))}
                        {logout && (
                          <button
                            type="button"
                            className="navbar-profile-logout"
                            onClick={isDashboard ? () => {
                              setProfileOpen(false);
                              setMobileOpen(false);
                              logout();
                            } : handleLogout}
                          >
                            {action?.label || "Log out"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <ul className="nav-links">
                <li>
                  <Link
                    to="/login"
                    className={`nav-link${isActive("/login") ? " active" : ""}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="nav-link nav-link-cta"
                    onClick={() => setMobileOpen(false)}
                  >
                    Register
                  </Link>
                </li>
              </ul>
            )}
          </nav>
        </div>
      </header>
      {isDashboard && (
        <DashboardSectionNavigation
          items={workflowItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
          className={sectionNavigationClassName}
        />
      )}
      {settingsOpen && (
        <DashboardSettingsModal
          user={profile}
          applicationItem={applicationItems[0]}
          notificationItem={notificationItems[0]}
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          onClose={() => setSettingsOpen(false)}
          onNavigateToTab={handleTabChange}
          onProfileUpdated={nextProfile => {
            setProfileOverride(nextProfile);
            sessionStorage.setItem("user-profile", JSON.stringify(nextProfile));
          }}
        />
      )}
    </>
  );
}

function DashboardSectionNavigation({ items, activeTab, onTabChange, className }) {
  if (items.length === 0) return null;
  return (
    <nav className={"dashboard-section-navigation " + (className || "")} aria-label="Dashboard sections">
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={key === activeTab ? "active" : ""}
          aria-current={key === activeTab ? "page" : undefined}
          onClick={() => onTabChange?.(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export default Navbar;

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./DashboardSettingsModal.css";

const SETTINGS_TABS = [
  ["profile", "Profile"],
  ["applications", "My applications"],
  ["documents", "Documents"],
  ["notifications", "Notifications"],
  ["preferences", "Preferences"],
  ["security", "Security"],
  ["linked", "Linked services"],
  ["privacy", "Privacy"]
];

const SERVICE_LINKS = [
  ["Home Affairs", "/home-affairs-dashboard"],
  ["Passport", "/passport-office-dashboard"],
  ["Police", "/police-dashboard"],
  ["Finance", "/finance-dashboard"],
  ["Pensions", "/pensions-dashboard"],
  ["Traffic", "/traffic-dashboard"]
];

function getValue(value) {
  return value || "Not provided";
}

export default function DashboardSettingsModal({
  user,
  applicationItem,
  notificationItem,
  activeTab,
  onTabChange,
  onClose,
  onNavigateToTab
}) {
  const [isDarkMode, setIsDarkMode] = useState(
    () => document.body.dataset.theme === "dark"
  );

  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const openDashboardTab = item => {
    if (!item) return;
    onClose();
    onNavigateToTab(item[0]);
  };

  const toggleDarkMode = () => {
    const nextDarkMode = !isDarkMode;
    localStorage.setItem("home-affairs-theme", nextDarkMode ? "dark" : "light");
    document.body.dataset.theme = nextDarkMode ? "dark" : "light";
    setIsDarkMode(nextDarkMode);
    window.dispatchEvent(new CustomEvent("home-affairs-theme-change", {
      detail: { isDarkMode: nextDarkMode }
    }));
  };

  return (
    <div
      className="dashboard-settings-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="dashboard-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-settings-title"
      >
        <header className="dashboard-settings-header">
          <div>
            <h2 id="dashboard-settings-title">Settings</h2>
            <p>Manage your profile and service activity.</p>
          </div>
          <button
            className="dashboard-settings-close"
            type="button"
            aria-label="Close settings"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <nav className="dashboard-settings-tabs" role="tablist" aria-label="Settings sections">
          {SETTINGS_TABS.map(([key, label]) => (
            <button
              key={key}
              id={`dashboard-settings-tab-${key}`}
              className={activeTab === key ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              aria-controls="dashboard-settings-panel"
              onClick={() => onTabChange(key)}
            >
              {key === "applications" && applicationItem
                ? applicationItem[1].replace(/\s*\(\d+\)\s*$/, "")
                : key === "notifications" && notificationItem
                  ? notificationItem[1].replace(/\s*\(\d+\)\s*$/, "")
                  : label}
            </button>
          ))}
        </nav>

        <div
          className="dashboard-settings-content"
          id="dashboard-settings-panel"
          role="tabpanel"
          aria-labelledby={`dashboard-settings-tab-${activeTab}`}
        >
          {activeTab === "profile" && (
            <section className="dashboard-settings-card">
              <h3>Profile details</h3>
              <dl className="dashboard-settings-profile">
                <div><dt>Full name</dt><dd>{getValue(user?.full_name || user?.name)}</dd></div>
                <div><dt>Email</dt><dd>{getValue(user?.email)}</dd></div>
                <div><dt>Phone</dt><dd>{getValue(user?.phone)}</dd></div>
                <div><dt>National ID</dt><dd>{getValue(user?.national_id_number || user?.national_id)}</dd></div>
                <div><dt>Account type</dt><dd>{getValue(user?.account_type || user?.role)}</dd></div>
                <div><dt>Account status</dt><dd>{getValue(user?.account_status)}</dd></div>
              </dl>
            </section>
          )}

          {activeTab === "applications" && (
            <section className="dashboard-settings-card">
              <h3>{applicationItem?.[1].replace(/\s*\(\d+\)\s*$/, "") || "My applications"}</h3>
              <p>Review your submitted requests, current statuses, and service updates.</p>
              <button
                className="dashboard-settings-primary"
                type="button"
                disabled={!applicationItem}
                onClick={() => openDashboardTab(applicationItem)}
              >
                Open applications
              </button>
            </section>
          )}

          {activeTab === "documents" && (
            <section className="dashboard-settings-card">
              <h3>Documents</h3>
              <p>Documents you submit are attached to their related service requests.</p>
              <button
                className="dashboard-settings-primary"
                type="button"
                disabled={!applicationItem}
                onClick={() => openDashboardTab(applicationItem)}
              >
                Review submissions
              </button>
            </section>
          )}

          {activeTab === "notifications" && (
            <section className="dashboard-settings-card">
              <h3>{notificationItem?.[1].replace(/\s*\(\d+\)\s*$/, "") || "Notifications"}</h3>
              <p>Check updates about your applications, requests, and account activity.</p>
              <button
                className="dashboard-settings-primary"
                type="button"
                disabled={!notificationItem}
                onClick={() => openDashboardTab(notificationItem)}
              >
                Open notifications
              </button>
            </section>
          )}

          {activeTab === "preferences" && (
            <section className="dashboard-settings-card dashboard-settings-preference">
              <div>
                <h3>Appearance</h3>
                <p>Choose the display theme for this portal.</p>
              </div>
              <button
                className="dashboard-settings-switch"
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                onClick={toggleDarkMode}
              >
                <span>{isDarkMode ? "Dark mode" : "Light mode"}</span>
                <span className="dashboard-settings-switch-track" aria-hidden="true">
                  <span />
                </span>
              </button>
            </section>
          )}

          {activeTab === "security" && (
            <section className="dashboard-settings-card">
              <h3>Account security</h3>
              <p>Keep your sign-in details private and sign out when using a shared device.</p>
              <dl className="dashboard-settings-profile">
                <div><dt>Account status</dt><dd>{getValue(user?.account_status)}</dd></div>
                <div><dt>Sign-in method</dt><dd>Managed by your account provider</dd></div>
              </dl>
            </section>
          )}

          {activeTab === "linked" && (
            <section className="dashboard-settings-card">
              <h3>Linked services</h3>
              <p>Open a department dashboard using your signed-in account.</p>
              <div className="dashboard-settings-service-links">
                {SERVICE_LINKS.map(([label, route]) => (
                  <Link key={route} to={route} onClick={onClose}>{label}</Link>
                ))}
              </div>
            </section>
          )}

          {activeTab === "privacy" && (
            <section className="dashboard-settings-card">
              <h3>Privacy</h3>
              <p>Your profile information and submitted documents are used to process government service requests.</p>
              <p>Only provide information required for the service you are requesting.</p>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

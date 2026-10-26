import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, API_BASE } from "../Database/firebase";
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

function dateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function DashboardSettingsModal({
  user,
  applicationItem,
  notificationItem,
  activeTab,
  onTabChange,
  onClose,
  onNavigateToTab,
  onProfileUpdated
}) {
  const [isDarkMode, setIsDarkMode] = useState(
    () => document.body.dataset.theme === "dark"
  );
  const [profileUser, setProfileUser] = useState(user);
  const [profileForm, setProfileForm] = useState({
    date_of_birth: dateInputValue(user?.date_of_birth),
    phone: user?.phone || ""
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    setProfileUser(user);
    setProfileForm({
      date_of_birth: dateInputValue(user?.date_of_birth),
      phone: user?.phone || ""
    });
  }, [user]);

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

  const saveProfile = async event => {
    event.preventDefault();
    setProfileMessage("");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setProfileMessage("Please sign in again before saving your profile.");
      return;
    }
    setProfileSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(API_BASE + "/me/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(profileForm)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save profile details.");
      setProfileUser(data.user);
      setProfileForm({
        date_of_birth: dateInputValue(data.user?.date_of_birth),
        phone: data.user?.phone || ""
      });
      setProfileMessage("Profile details saved.");
      onProfileUpdated?.(data.user);
      window.dispatchEvent(new CustomEvent("home-affairs-profile-updated", {
        detail: { user: data.user }
      }));
    } catch (error) {
      setProfileMessage(error.message || "Could not save profile details.");
    } finally {
      setProfileSaving(false);
    }
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
                <div><dt>Full name</dt><dd>{getValue(profileUser?.full_name || profileUser?.name)}</dd></div>
                <div><dt>Email</dt><dd>{getValue(profileUser?.email)}</dd></div>
                <div><dt>Phone</dt><dd>{getValue(profileUser?.phone)}</dd></div>
                <div><dt>National ID</dt><dd>{getValue(profileUser?.national_id_number || profileUser?.national_id)}</dd></div>
                <div><dt>Account type</dt><dd>{getValue(profileUser?.account_type || profileUser?.role)}</dd></div>
                <div><dt>Account status</dt><dd>{getValue(profileUser?.account_status)}</dd></div>
              </dl>
              <form className="dashboard-settings-profile-form" onSubmit={saveProfile}>
                <h3>Update missing profile details</h3>
                <p>Add your birth date here so services such as Old Age Pension can calculate your age automatically.</p>
                <label>
                  Date of birth
                  <input
                    type="date"
                    required
                    value={profileForm.date_of_birth}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={event => setProfileForm(previous => ({
                      ...previous, date_of_birth: event.target.value
                    }))}
                  />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={profileForm.phone}
                    placeholder="Optional contact number"
                    onChange={event => setProfileForm(previous => ({
                      ...previous, phone: event.target.value
                    }))}
                  />
                </label>
                {profileMessage && (
                  <p className="dashboard-settings-profile-message" role="status">{profileMessage}</p>
                )}
                <button className="dashboard-settings-primary" type="submit" disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Save profile"}
                </button>
              </form>
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

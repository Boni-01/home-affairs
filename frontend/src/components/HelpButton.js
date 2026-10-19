import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./HelpButton.css";

const HELP_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/home-affairs-dashboard",
  "/police-dashboard",
  "/traffic-dashboard",
  "/finance-dashboard",
  "/passport-office-dashboard",
  "/pensions-dashboard",
  "/admin/home-affairs",
  "/admin/passport",
  "/admin/police",
  "/admin/finance",
  "/admin/pensions",
  "/admin/traffic"
]);

export default function HelpButton() {
  const { pathname } = useLocation();
  const isAdminDashboard = pathname.startsWith("/admin/");
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("home-affairs-theme") === "dark"
  );

  useEffect(() => {
    if (HELP_PATHS.has(pathname) && isDarkMode) {
      document.body.dataset.theme = "dark";
    } else {
      delete document.body.dataset.theme;
    }
  }, [isDarkMode, pathname]);

  useEffect(() => {
    const syncTheme = event => {
      setIsDarkMode(
        event.detail?.isDarkMode ?? localStorage.getItem("home-affairs-theme") === "dark"
      );
    };
    window.addEventListener("home-affairs-theme-change", syncTheme);
    return () => window.removeEventListener("home-affairs-theme-change", syncTheme);
  }, []);

  if (!HELP_PATHS.has(pathname)) return null;

  const toggleDarkMode = () => {
    const nextDarkMode = !isDarkMode;
    localStorage.setItem("home-affairs-theme", nextDarkMode ? "dark" : "light");
    setIsDarkMode(nextDarkMode);
  };

  return (
    <div className="help-widget">
      {!isAdminDashboard && isOpen && (
        <section id="help-panel" className="help-panel" aria-labelledby="help-panel-title">
          <h2 id="help-panel-title">Need help?</h2>
          <p>Contact the Government Service Desk for assistance.</p>
          <a href="mailto:helpdesk@gov.ls">helpdesk@gov.ls</a>
        </section>
      )}
      <button
        className="dark-mode-button"
        type="button"
        aria-label={isDarkMode ? "Turn dark mode off" : "Turn dark mode on"}
        aria-pressed={isDarkMode}
        onClick={toggleDarkMode}
      >
        <svg
          className="dark-mode-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isDarkMode ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
            </>
          ) : (
            <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
          )}
        </svg>
        <span>{isDarkMode ? "Lightmode" : "Dark Mode"}</span>
      </button>
      {!isAdminDashboard && (
        <button
          className="help-button"
          type="button"
          aria-expanded={isOpen}
          aria-controls={isOpen ? "help-panel" : undefined}
          onClick={() => setIsOpen((open) => !open)}
        >
          <svg
            className="help-button-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.5 13.5 12 22l-9-9V3h10l7.5 7.5a2.12 2.12 0 0 1 0 3Z" />
            <circle cx="7.5" cy="7.5" r=".75" />
            <path d="M11 10a2 2 0 1 1 3.5 1.3c-.9.8-1.5 1.1-1.5 2.2M13 16.5h.01" />
          </svg>
          <span>Help</span>
        </button>
      )}
    </div>
  );
}
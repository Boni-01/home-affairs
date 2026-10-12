import { useState } from "react";
import { useLocation } from "react-router-dom";
import "./HelpButton.css";

const HELP_PATHS = new Set([
  "/",
  "/home-affairs-dashboard",
  "/police-dashboard",
  "/traffic-dashboard",
  "/finance-dashboard",
  "/passport-office-dashboard",
  "/pensions-dashboard"
]);

export default function HelpButton() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!HELP_PATHS.has(pathname)) return null;

  return (
    <div className="help-widget">
      {isOpen && (
        <section id="help-panel" className="help-panel" aria-labelledby="help-panel-title">
          <h2 id="help-panel-title">Need help?</h2>
          <p>Contact the Government Service Desk for assistance.</p>
          <a href="mailto:helpdesk@gov.ls">helpdesk@gov.ls</a>
        </section>
      )}
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
    </div>
  );
}
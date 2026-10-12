import React from "react";
import "./DashboardSearch.css";

export function matchesDashboardSearch(item, query) {
  if (!query.trim()) return true;
  return JSON.stringify(item).toLowerCase().includes(query.trim().toLowerCase());
}

export default function DashboardSearch({ onSearch, placeholder = "Search for an article or service" }) {
  return (
    <div className="dashboard-header-actions">
      <div className="dashboard-search">
        <input
          type="text"
          onChange={event => onSearch(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <button type="button" aria-label="Search">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

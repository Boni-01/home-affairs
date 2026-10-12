import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { COLORS } from "../styles/dashboardStyles";
import "./DashboardSidebar.css";

const ministries = [
  { label: "Home Affairs", route: "/home-affairs-dashboard" },
  { label: "Passport Office", route: "/passport-office-dashboard" },
  { label: "Police Services", route: "/police-dashboard" },
  { label: "Finance Services", route: "/finance-dashboard" },
  { label: "Pensions", route: "/pensions-dashboard" },
  { label: "Traffic & Transport", route: "/traffic-dashboard" }
];

const adminOffices = [
  { label: "Home Affairs Admin", route: "/admin/home-affairs" },
  { label: "Passport Admin", route: "/admin/passport" },
  { label: "Police Admin", route: "/admin/police" },
  { label: "Finance Admin", route: "/admin/finance" },
  { label: "Pensions Admin", route: "/admin/pensions" },
  { label: "Traffic Admin", route: "/admin/traffic" }
];

function DashboardSidebar({
  items,
  activeTab,
  onTabChange,
  action,
  children,
  onLogout
}) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = location.pathname.startsWith("/admin/");
  const links = isAdmin ? adminOffices : ministries;
  const currentBrand = links.find(({ route }) => route === location.pathname)?.label || (isAdmin ? "Home Affairs Admin" : "Home Affairs");

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        className="dashboard-sidebar-toggle"
        aria-label="Toggle dashboard sidebar"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        ☰
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="dashboard-sidebar-backdrop"
          aria-label="Close dashboard sidebar"
          onClick={closeMobile}
        />
      )}
      <aside className={`dashboard-sidebar${mobileOpen ? " open" : ""}`}>
        <Link
          to={isAdmin ? "/admin/home-affairs" : "/home-affairs-dashboard"}
          className="dashboard-sidebar-brand"
          onClick={closeMobile}
        >
          <span className="dashboard-sidebar-brand-title">{currentBrand}</span>
          <span className="dashboard-sidebar-brand-subtitle">Kingdom of Lesotho</span>
        </Link>

        {children}

        {items.length > 0 && (
          <>
            <p className="dashboard-sidebar-heading">Dashboard</p>
            <nav className="dashboard-sidebar-sections" aria-label="Dashboard sections">
              {items.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (onTabChange) onTabChange(key);
                    closeMobile();
                  }}
                  aria-current={activeTab === key ? "page" : undefined}
                  style={{
                    color: activeTab === key ? COLORS.white : "rgba(255,255,255,0.82)",
                    background: activeTab === key ? "rgba(255,255,255,0.16)" : "transparent"
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
          </>
        )}

        <p className="dashboard-sidebar-heading">
          {isAdmin ? "Admin offices" : "Ministries"}
        </p>
        <nav className="dashboard-sidebar-ministries" aria-label={isAdmin ? "Admin offices" : "Ministries"}>
          {links.map(({ label, route }) => (
            <Link
              key={route}
              to={route}
              className={location.pathname === route ? "active" : ""}
              aria-current={location.pathname === route ? "page" : undefined}
              onClick={closeMobile}
            >
              {label}
            </Link>
          ))}
        </nav>

        {(action || onLogout) && (
          <button
            type="button"
            className="dashboard-sidebar-logout"
            onClick={() => {
              if (action) action.onClick();
              else onLogout();
              closeMobile();
            }}
          >
            {action ? action.label : "Log out"}
          </button>
        )}
      </aside>
    </>
  );
}

export default DashboardSidebar;

import React from "react";
import {
  COLORS,
  layout,
  header,
  cards,
  grids,
  tables,
  section,
  getStatusStyle
} from "../styles/dashboardStyles";

const SERVICES = [
  { name: "Birth certificates", count: "1,284", detail: "Applications this month", icon: "📄" },
  { name: "Identity documents", count: "936", detail: "Applications this month", icon: "🪪" },
  { name: "Passports", count: "512", detail: "Applications this month", icon: "🛂" },
  { name: "Marriage certificates", count: "248", detail: "Applications this month", icon: "💍" },
  { name: "Death certificates", count: "184", detail: "Applications this month", icon: "📋" }
];

const APPLICATIONS = [
  { reference: "HA-08421", service: "Birth certificate", applicant: "Mpho Kgosana", submitted: "Today, 09:42", status: "Ready for collection" },
  { reference: "HA-08417", service: "Smart ID", applicant: "Naledi Mokoena", submitted: "Today, 09:18", status: "Under review" },
  { reference: "HA-08396", service: "Passport renewal", applicant: "Thabo Molefe", submitted: "Yesterday, 15:36", status: "Processing" },
  { reference: "HA-08382", service: "Marriage certificate", applicant: "Lerato Dube", submitted: "Yesterday, 14:05", status: "Completed" }
];

function HomeAffairsDashboard() {
  const today = new Date().toLocaleDateString("en-LS", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        {/* ============================================================
            HEADER
            ============================================================ */}
        <header style={header.wrapper}>
          <div
            style={{
              ...header.content,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap"
            }}
          >
            <div>
              <p style={header.eyebrow}>Department of Home Affairs</p>
              <h1 style={header.title}>Home Affairs Dashboard</h1>
              <p style={header.subtitle}>
                Monitor certificate services and application activity · {today}
              </p>
            </div>
            <span style={header.liveBadge}>
              <span style={header.liveDot} />
              Services operational
            </span>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        {/* ============================================================
            METRICS
            ============================================================ */}
        <section style={grids.metrics} aria-label="Certificate applications this month">
          {SERVICES.map((service) => (
            <article key={service.name} style={cards.metric}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8
                }}
              >
                <p style={cards.metricLabel}>{service.name}</p>
                <span style={{ fontSize: 22 }} aria-hidden="true">
                  {service.icon}
                </span>
              </div>
              <p style={cards.metricValue}>{service.count}</p>
              <p style={cards.metricDetail}>{service.detail}</p>
            </article>
          ))}
        </section>

        {/* ============================================================
            RECENT APPLICATIONS + QUICK ACTIONS
            ============================================================ */}
        <section style={grids.twoCol}>
          {/* Recent applications table */}
          <article style={cards.cardPadded}>
            <div style={section.wrapper}>
              <h2 style={section.title}>Recent applications</h2>
              <p style={section.subtitle}>
                Latest updates across Home Affairs services
              </p>
            </div>
            <div style={tables.wrapper}>
              <table style={tables.table}>
                <thead>
                  <tr>
                    <th style={tables.th}>Reference</th>
                    <th style={tables.th}>Service</th>
                    <th style={tables.th}>Applicant</th>
                    <th style={tables.th}>Submitted</th>
                    <th style={tables.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {APPLICATIONS.map((app) => {
                    const statusStyle = getStatusStyle(app.status);
                    return (
                      <tr key={app.reference}>
                        <td style={{ ...tables.td, ...tables.tdFirst }}>
                          {app.reference}
                        </td>
                        <td style={tables.td}>{app.service}</td>
                        <td style={tables.td}>{app.applicant}</td>
                        <td style={tables.td}>{app.submitted}</td>
                        <td style={tables.td}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              color: statusStyle.color,
                              background: statusStyle.background,
                              textTransform: "uppercase",
                              letterSpacing: 0.3
                            }}
                          >
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          {/* Quick actions sidebar */}
          <aside style={cards.cardPadded}>
            <div style={section.wrapper}>
              <h2 style={section.title}>Quick actions</h2>
              <p style={section.subtitle}>Common service tasks</p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <QuickAction
                icon="＋"
                title="Register a certificate"
                subtitle="Create a certificate record"
              />
              <QuickAction
                icon="🔍"
                title="Find an application"
                subtitle="Search by reference or applicant"
              />
              <QuickAction
                icon="📊"
                title="View service records"
                subtitle="Review department activity"
              />
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: COLORS.blueLight,
                borderRadius: 10,
                borderLeft: `3px solid ${COLORS.blue}`
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: 13,
                  color: COLORS.blue,
                  marginBottom: 4
                }}
              >
                Services operational
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: COLORS.textMid,
                  lineHeight: 1.5
                }}
              >
                Certificate and identity services are currently available.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

// ============================================================
// QUICK ACTION BUTTON
// ============================================================
function QuickAction({ icon, title, subtitle }) {
  return (
    <button
      type="button"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "#fff",
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: 10,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = COLORS.blue;
        e.currentTarget.style.background = COLORS.blueLight;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = COLORS.borderLight;
        e.currentTarget.style.background = "#fff";
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          borderRadius: 9,
          background: COLORS.blueLight,
          color: COLORS.blue,
          fontSize: 16
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>
        <strong
          style={{
            display: "block",
            fontSize: 13,
            color: COLORS.textDark,
            fontWeight: 700
          }}
        >
          {title}
        </strong>
        <small
          style={{
            display: "block",
            marginTop: 2,
            fontSize: 11,
            color: COLORS.textMuted
          }}
        >
          {subtitle}
        </small>
      </span>
    </button>
  );
}

export default HomeAffairsDashboard;
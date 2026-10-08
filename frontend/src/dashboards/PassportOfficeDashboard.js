import React from "react";
import {
  COLORS,
  layout,
  header,
  cards,
  grids,
  section,
  getStatusStyle
} from "../styles/dashboardStyles";

const SERVICES = [
  "Passport application",
  "Passport renewal",
  "Passport replacement",
  "Visa application",
  "Visa renewal",
  "Travel document services",
  "Identity verification",
  "Document collection & status checks"
];

const NOTIFICATIONS = [
  {
    title: "Queue Update",
    message: "Passport verification counters 2 and 4 are now open.",
    time: "2 min ago",
    priority: "High"
  },
  {
    title: "Document Review",
    message: "Two applications require additional identity checks.",
    time: "9 min ago",
    priority: "Medium"
  },
  {
    title: "System Notice",
    message: "Biometric capture station is operating normally.",
    time: "15 min ago",
    priority: "Low"
  }
];

const PRIORITY_STYLES = {
  High: { color: "#b91c1c", background: "#fee2e2" },
  Medium: { color: "#92400e", background: "#fef3c7" },
  Low: { color: "#166534", background: "#dcfce7" }
};

function PassportOfficeDashboard() {
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
              <p style={header.eyebrow}>Operations</p>
              <h1 style={header.title}>Passport Office Dashboard</h1>
              <p style={header.subtitle}>
                Manage passport, visa and travel document services · {today}
              </p>
            </div>
            <span style={header.liveBadge}>
              <span style={header.liveDot} />
              Live operations
            </span>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        {/* ============================================================
            SERVICES + NOTIFICATIONS
            ============================================================ */}
        <section style={grids.twoCol}>
          {/* Services offered */}
          <article style={cards.cardPadded}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <h2 style={section.title}>Services offered</h2>
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: COLORS.blueLight,
                  color: COLORS.blue,
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                {SERVICES.length} services
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10
              }}
            >
              {SERVICES.map((service) => (
                <div
                  key={service}
                  style={{
                    padding: "12px 14px",
                    background: "#f8fafc",
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textMid
                  }}
                >
                  {service}
                </div>
              ))}
            </div>
          </article>

          {/* Live notifications */}
          <aside style={cards.cardPadded}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <h2 style={section.title}>Live notifications</h2>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ef4444",
                  boxShadow: "0 0 0 4px #fee2e2"
                }}
                aria-hidden="true"
              />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {NOTIFICATIONS.map((notification) => {
                const priorityStyle = PRIORITY_STYLES[notification.priority];
                return (
                  <div
                    key={notification.title}
                    style={{
                      padding: 14,
                      background: "#f8fafc",
                      borderLeft: `4px solid ${priorityStyle.color}`,
                      borderRadius: 10
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13,
                          color: COLORS.textDark,
                          fontWeight: 700
                        }}
                      >
                        {notification.title}
                      </strong>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          color: priorityStyle.color,
                          background: priorityStyle.background,
                          textTransform: "uppercase",
                          letterSpacing: 0.4
                        }}
                      >
                        {notification.priority}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: 12,
                        color: COLORS.textMid,
                        lineHeight: 1.5
                      }}
                    >
                      {notification.message}
                    </p>
                    <small style={{ fontSize: 11, color: COLORS.textMuted }}>
                      {notification.time}
                    </small>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default PassportOfficeDashboard;
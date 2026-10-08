import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ============================================================
// LESOTHO FLAG COLORS
// ============================================================
const COLORS = {
  blue: "#00209F",
  white: "#FFFFFF",
  green: "#009543",
  black: "#000000",
  lightBg: "#F4F7FB",
  border: "#CBD5E1",
  textDark: "#1e293b",
  textMuted: "#64748B",
  error: "#B3261E"
};

// ============================================================
// AVAILABLE DASHBOARDS
// ============================================================
const DASHBOARDS = [
  {
    title: "Applications",
    description: "Start a new application or track one you have already submitted.",
    href: "/dashboard/applications",
    icon: "📄",
    color: COLORS.blue
  },
  {
    title: "Appointments",
    description: "Book or review appointments for Home Affairs services.",
    href: "/dashboard/appointments",
    icon: "📅",
    color: COLORS.green
  },
  {
    title: "Documents",
    description: "View documents and supporting information for your applications.",
    href: "/dashboard/documents",
    icon: "🗂️",
    color: COLORS.blue
  },
  {
    title: "Payments",
    description: "Review fees and payment information for your services.",
    href: "/dashboard/payments",
    icon: "💳",
    color: COLORS.green
  },
  {
    title: "My Profile",
    description: "View and update your personal and contact information.",
    href: "/dashboard/profile",
    icon: "👤",
    color: COLORS.blue
  },
  {
    title: "Notifications",
    description: "Read messages and updates about your applications.",
    href: "/dashboard/notifications",
    icon: "🔔",
    color: COLORS.green
  }
];

function HomeDashboard() {
  const [userName, setUserName] = useState("");
  const [accountType, setAccountType] = useState("");

  // Load user data from sessionStorage
  useEffect(() => {
    try {
      const profileRaw = sessionStorage.getItem("user-profile");
      const type = sessionStorage.getItem("account-type");

      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        const name =
          profile.first_name ||
          profile.name ||
          (profile.firstName && profile.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : "");
        setUserName(name);
      }

      if (type) setAccountType(type);
    } catch (err) {
      console.warn("Could not read profile from sessionStorage:", err);
    }
  }, []);

  const today = new Date().toLocaleDateString("en-LS", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <main style={styles.page}>
      {/* ============================================================
          WELCOME HEADER
          ============================================================ */}
      <section style={styles.header}>
        <div style={styles.headerContent}>
          <p style={styles.headerEyebrow}>Lesotho Government Services</p>
          <h1 style={styles.headerTitle}>
            {userName ? `Welcome back, ${userName}` : "Home Dashboard"}
          </h1>
          <p style={styles.headerSubtitle}>
            {accountType
              ? `You are signed in as a ${accountType}.`
              : "Select a dashboard to manage your services and account."}
          </p>
          <p style={styles.headerDate}>{today}</p>
        </div>

        {/* Flag stripe accent */}
        <div style={styles.flagStripe}>
          <div style={{ flex: 1, background: COLORS.blue }} />
          <div
            style={{
              flex: 1,
              background: COLORS.white,
              borderTop: `1px solid ${COLORS.border}`,
              borderBottom: `1px solid ${COLORS.border}`
            }}
          />
          <div style={{ flex: 1, background: COLORS.green }} />
        </div>
      </section>

      {/* ============================================================
          QUICK STATS (Optional — remove if not needed)
          ============================================================ */}
      <section style={styles.statsRow}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Active Applications</p>
          <p style={styles.statValue}>0</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Upcoming Appointments</p>
          <p style={styles.statValue}>0</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Unread Notifications</p>
          <p style={styles.statValue}>0</p>
        </div>
      </section>

      {/* ============================================================
          DASHBOARD CARDS
          ============================================================ */}
      <section aria-label="Available dashboards" style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.grid}>
          {DASHBOARDS.map(({ title, description, href, icon, color }) => (
            <Link
              key={title}
              to={href}
              style={{
                ...styles.card,
                borderTop: `4px solid ${color}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 32px rgba(0, 32, 159, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 32, 159, 0.06)";
              }}
            >
              <span aria-hidden="true" style={styles.cardIcon}>
                {icon}
              </span>
              <h3 style={styles.cardTitle}>{title}</h3>
              <p style={styles.cardDescription}>{description}</p>
              <span style={{ ...styles.cardCta, color }}>
                Open →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================================
          FOOTER INFO
          ============================================================ */}
      <section style={styles.infoBox}>
        <p style={styles.infoText}>
          This is the Lesotho Integrated Government Services portal. Your data is
          protected and shared only with authorised departments for the purpose
          of processing your applications.
        </p>
      </section>
    </main>
  );
}

// ============================================================
// INLINE STYLES
// ============================================================
const styles = {
  page: {
    minHeight: "100vh",
    background: COLORS.lightBg,
    padding: "32px 24px 64px",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: COLORS.textDark
  },

  // ----------------------------------------------------------
  // Header
  // ----------------------------------------------------------
  header: {
    maxWidth: 1120,
    margin: "0 auto 32px",
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 2px 12px rgba(0, 32, 159, 0.06)",
    overflow: "hidden"
  },
  headerContent: {
    padding: "32px 36px 28px"
  },
  headerEyebrow: {
    margin: "0 0 8px",
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  headerTitle: {
    margin: "0 0 10px",
    color: COLORS.blue,
    fontSize: 30,
    fontWeight: 700
  },
  headerSubtitle: {
    margin: "0 0 12px",
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 1.5
  },
  headerDate: {
    margin: 0,
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: "italic"
  },
  flagStripe: {
    display: "flex",
    height: 6
  },

  // ----------------------------------------------------------
  // Stats row
  // ----------------------------------------------------------
  statsRow: {
    maxWidth: 1120,
    margin: "0 auto 32px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16
  },
  statCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 22px",
    boxShadow: "0 2px 8px rgba(0, 32, 159, 0.06)",
    borderLeft: `4px solid ${COLORS.blue}`
  },
  statLabel: {
    margin: "0 0 6px",
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: 600
  },
  statValue: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.blue
  },

  // ----------------------------------------------------------
  // Section
  // ----------------------------------------------------------
  section: {
    maxWidth: 1120,
    margin: "0 auto 32px"
  },
  sectionTitle: {
    margin: "0 0 16px",
    fontSize: 18,
    color: COLORS.textDark,
    fontWeight: 700
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20
  },

  // ----------------------------------------------------------
  // Card
  // ----------------------------------------------------------
  card: {
    display: "block",
    padding: "22px 24px 20px",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    background: "#fff",
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 2px 8px rgba(0, 32, 159, 0.06)",
    transition: "all 0.2s ease",
    cursor: "pointer"
  },
  cardIcon: {
    fontSize: 30,
    display: "block",
    marginBottom: 12
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.blue
  },
  cardDescription: {
    margin: "0 0 16px",
    fontSize: 13,
    lineHeight: 1.55,
    color: COLORS.textMuted
  },
  cardCta: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.3
  },

  // ----------------------------------------------------------
  // Info box
  // ----------------------------------------------------------
  infoBox: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "18px 22px",
    background: "#fff",
    borderRadius: 10,
    borderLeft: `4px solid ${COLORS.green}`,
    boxShadow: "0 2px 8px rgba(0, 32, 159, 0.04)"
  },
  infoText: {
    margin: 0,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 1.6
  }
};

export default HomeDashboard;
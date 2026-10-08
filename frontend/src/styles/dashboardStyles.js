// ============================================================
// SHARED DASHBOARD STYLES — Lesotho Government Theme
// ============================================================

export const COLORS = {
  blue: "#00209F",
  blueDark: "#001a80",
  blueLight: "#e6ebf9",
  white: "#FFFFFF",
  green: "#009543",
  greenDark: "#007a36",
  greenLight: "#e6f6ee",
  black: "#000000",
  lightBg: "#F4F7FB",
  border: "#CBD5E1",
  borderLight: "#e2e8f0",
  textDark: "#1e293b",
  textMid: "#526174",
  textMuted: "#64748B",
  error: "#B3261E",
  warning: "#b45309",
  warningLight: "#fff4df",
  success: "#067647",
  successLight: "#ecfdf3",
  info: "#175cd3",
  infoLight: "#eff8ff"
};

export const STATUS_STYLES = {
  // Statuses that are good/complete
  good: {
    color: COLORS.success,
    background: COLORS.successLight
  },
  // Statuses that need attention
  caution: {
    color: COLORS.warning,
    background: COLORS.warningLight
  },
  // Statuses in progress
  info: {
    color: COLORS.info,
    background: COLORS.infoLight
  },
  // Statuses that failed/rejected
  danger: {
    color: COLORS.error,
    background: "#fdecea"
  }
};

// ============================================================
// SHARED STYLE OBJECTS
// ============================================================

export const layout = {
  page: {
    minHeight: "100vh",
    background: COLORS.lightBg,
    padding: "32px 24px 64px",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: COLORS.textDark
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto"
  }
};

export const header = {
  // Main page header card
  wrapper: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 2px 12px rgba(0, 32, 159, 0.06)",
    marginBottom: 28,
    overflow: "hidden"
  },
  content: {
    padding: "28px 32px 24px"
  },
  eyebrow: {
    margin: "0 0 8px",
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    margin: "0 0 8px",
    color: COLORS.blue,
    fontSize: 28,
    fontWeight: 700
  },
  subtitle: {
    margin: 0,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 1.5
  },
  // Flag stripe accent
  flagStripe: {
    display: "flex",
    height: 6
  },
  // Right-aligned live badge
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    background: COLORS.greenLight,
    color: COLORS.greenDark,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: COLORS.green,
    boxShadow: `0 0 0 4px ${COLORS.greenLight}`
  }
};

export const cards = {
  card: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0, 32, 159, 0.06)",
    border: `1px solid ${COLORS.borderLight}`
  },
  cardPadded: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0, 32, 159, 0.06)",
    border: `1px solid ${COLORS.borderLight}`,
    padding: 22
  },
  // Metric card
  metric: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0, 32, 159, 0.06)",
    padding: "18px 20px",
    borderTop: `4px solid ${COLORS.blue}`
  },
  metricLabel: {
    margin: "0 0 8px",
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: 600
  },
  metricValue: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    color: COLORS.blue,
    letterSpacing: "-0.5px"
  },
  metricDetail: {
    margin: "6px 0 0",
    fontSize: 12,
    color: COLORS.textMuted
  }
};

export const grids = {
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 24
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 1fr)",
    gap: 20,
    marginBottom: 24
  },
  services: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16
  }
};

export const tables = {
  wrapper: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  th: {
    padding: "12px 12px 12px 0",
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontWeight: 600,
    borderBottom: `1px solid ${COLORS.borderLight}`,
    whiteSpace: "nowrap"
  },
  td: {
    padding: "13px 12px 13px 0",
    borderBottom: `1px solid ${COLORS.borderLight}`,
    color: COLORS.textMid,
    fontSize: 13,
    whiteSpace: "nowrap"
  },
  tdFirst: {
    color: COLORS.textDark,
    fontWeight: 600
  }
};

export const section = {
  wrapper: {
    marginBottom: 28
  },
  title: {
    margin: "0 0 6px",
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.textDark
  },
  subtitle: {
    margin: "0 0 16px",
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 1.5
  }
};

// ============================================================
// STATUS BADGE HELPER
// ============================================================

export function getStatusStyle(status) {
  const s = (status || "").toLowerCase();

  // Success / complete states
  if (
    s.includes("ready") ||
    s.includes("complete") ||
    s.includes("approved") ||
    s.includes("cleared") ||
    s.includes("paid") ||
    s.includes("active") ||
    s.includes("verified")
  ) {
    return STATUS_STYLES.good;
  }

  // Warning / action required
  if (
    s.includes("required") ||
    s.includes("pending") ||
    s.includes("unpaid") ||
    s.includes("delayed") ||
    s.includes("missing")
  ) {
    return STATUS_STYLES.caution;
  }

  // Rejected / failed
  if (
    s.includes("reject") ||
    s.includes("fail") ||
    s.includes("denied")
  ) {
    return STATUS_STYLES.danger;
  }

  // Default: in progress
  return STATUS_STYLES.info;
}
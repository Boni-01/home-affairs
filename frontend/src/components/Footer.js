import React from "react";
import { Link } from "react-router-dom";

// ============================================================
// LESOTHO FLAG COLORS
// ============================================================
const COLORS = {
  blue: "#00209F",
  white: "#FFFFFF",
  green: "#009543",
  black: "#000000",
  textLight: "#cbd5e1",
  textMuted: "#94a3b8"
};

const styles = {
  footer: {
    background: COLORS.blue,
    color: "#fff",
    marginTop: 48,
    fontFamily: "Arial, Helvetica, sans-serif"
  },
  flagStripe: {
    display: "flex",
    height: 4
  },
  content: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "40px 24px 24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 32
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#fff",
    marginBottom: 6
  },
  link: {
    color: COLORS.textLight,
    textDecoration: "none",
    fontSize: 13,
    transition: "color 0.15s"
  },
  text: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0
  },
  bottom: {
    borderTop: "1px solid rgba(255,255,255,0.15)",
    padding: "18px 24px",
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textMuted
  }
};

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={styles.footer}>
      {/* Flag stripe */}
      <div style={styles.flagStripe}>
        <div style={{ flex: 1, background: COLORS.blue }} />
        <div style={{ flex: 1, background: COLORS.white }} />
        <div style={{ flex: 1, background: COLORS.green }} />
      </div>

      {/* Main content */}
      <div style={styles.content}>
        {/* Column 1 — About */}
        <div style={styles.column}>
          <span style={styles.columnTitle}>Home Affairs</span>
          <p style={styles.text}>
            Kingdom of Lesotho — Integrated Government Services portal for
            citizens, residents, and authorized officers.
          </p>
        </div>

        {/* Column 2 — Quick Links */}
        <div style={styles.column}>
          <span style={styles.columnTitle}>Quick Links</span>
          <Link to="/home-dashboard" style={styles.link}>Dashboard</Link>
          <Link to="/home-affairs-dashboard" style={styles.link}>Home Affairs</Link>
          <Link to="/passport-office-dashboard" style={styles.link}>Passport Services</Link>
          <Link to="/traffic-dashboard" style={styles.link}>Traffic</Link>
        </div>

        {/* Column 3 — Services */}
        <div style={styles.column}>
          <span style={styles.columnTitle}>Services</span>
          <Link to="/pensions-dashboard" style={styles.link}>Pensions</Link>
          <Link to="/police-dashboard" style={styles.link}>Police</Link>
          <Link to="/finance-dashboard" style={styles.link}>Finance</Link>
          <Link to="/register" style={styles.link}>Create Account</Link>
        </div>

        {/* Column 4 — Contact */}
        <div style={styles.column}>
          <span style={styles.columnTitle}>Contact</span>
          <p style={styles.text}>Ministry of Home Affairs</p>
          <p style={styles.text}>Maseru, Lesotho</p>
          <p style={styles.text}>info@homeaffairs.gov.ls</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottom}>
        © {year} Kingdom of Lesotho — Home Affairs. All rights reserved.
        <br />
        Built as part of the BIHC3110 Human-Computer Interaction project at
        Limkokwing University of Creative Technology — Lesotho.
      </div>
    </footer>
  );
}

export default Footer;
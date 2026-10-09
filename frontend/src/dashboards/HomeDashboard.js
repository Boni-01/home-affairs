import React from "react";
import { Link, useNavigate } from "react-router-dom";

// ============================================================
// LESOTHO FLAG COLORS
// ============================================================
const COLORS = {
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
  textDark: "#1e293b",
  textMid: "#526174",
  textMuted: "#64748B"
};

// ============================================================
// MINISTRIES DATA
// ============================================================
const MINISTRIES = [
  {
    id: "home-affairs",
    name: "Home Affairs",
    description:
      "National ID, birth certificates, marriage, and civil registration services.",
    icon: "🏛️",
    route: "/home-affairs-dashboard",
    color: COLORS.blue
  },
  {
    id: "passport",
    name: "Passport Services",
    description:
      "Passport applications, renewals, and travel document services.",
    icon: "🛂",
    route: "/passport-office-dashboard",
    color: COLORS.green
  },
  {
    id: "traffic",
    name: "Traffic & Transport",
    description:
      "Driver's licences, vehicle registration, and roadworthiness certificates.",
    icon: "🚗",
    route: "/traffic-dashboard",
    color: COLORS.blue
  },
  {
    id: "finance",
    name: "Finance",
    description:
      "Government payments, tax refunds, and procurement services.",
    icon: "💰",
    route: "/finance-dashboard",
    color: COLORS.green
  },
  {
    id: "pensions",
    name: "Pensions",
    description:
      "Pension applications, payments, and beneficiary verification.",
    icon: "👴",
    route: "/pensions-dashboard",
    color: COLORS.blue
  },
  {
    id: "police",
    name: "Police Services",
    description:
      "Non-emergency reports, police clearance, and community safety.",
    icon: "🚔",
    route: "/police-dashboard",
    color: COLORS.green
  }
];

// ============================================================
// FEATURES DATA
// ============================================================
const FEATURES = [
  {
    icon: "🪪",
    title: "One Verified Identity",
    description:
      "Your National ID connects every government service — no more repeating yourself."
  },
  {
    icon: "📱",
    title: "Access From Anywhere",
    description:
      "Apply, track, and manage your services from any phone, tablet, or computer."
  },
  {
    icon: "🔔",
    title: "Real-Time Updates",
    description:
      "Get SMS, email, or in-app notifications when your application status changes."
  },
  {
    icon: "🔒",
    title: "Secure & Private",
    description:
      "Your data is protected and only shared with authorised departments for your requests."
  }
];

function HomeDashboard({ isAuthenticated }) {
  const navigate = useNavigate();

  // ------------------------------------------------------------
  // When user clicks a ministry card, remember the choice and
  // either go straight there (if logged in) or send them to login.
  // ------------------------------------------------------------
  const handleMinistryClick = (ministry) => {
    sessionStorage.setItem("selected-ministry", ministry.id);

    if (isAuthenticated) {
      navigate(ministry.route);
    } else {
      navigate("/login", { state: { from: { pathname: ministry.route } } });
    }
  };

  return (
    <main style={styles.page}>
      {/* ============================================================
          HERO
          ============================================================ */}
      <section style={styles.hero}>
        <div style={styles.flagStripe}>
          <div style={{ flex: 1, background: COLORS.blue }} />
          <div style={{ flex: 1, background: COLORS.white }} />
          <div style={{ flex: 1, background: COLORS.green }} />
        </div>

        <div style={styles.heroContent}>
          <span style={styles.heroBadge}>
            🇱🇸 Kingdom of Lesotho · Integrated Digital Services
          </span>

          <h1 style={styles.heroTitle}>
            All Government Services,
            <br />
            One Digital Platform
          </h1>

          <p style={styles.heroSubtitle}>
            Apply for identity documents, passports, driver's licences, and
            more — track every application in real time and access services
            from any department through one secure account.
          </p>

          <div style={styles.heroCTA}>
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/home-dashboard")}
                style={styles.btnPrimary}
              >
                Go to Dashboard
                <span style={{ marginLeft: 8 }}>→</span>
              </button>
            ) : (
              <>
                <Link to="/register" style={styles.btnPrimary}>
                  Create Your Account
                  <span style={{ marginLeft: 8 }}>→</span>
                </Link>
                <Link to="/login" style={styles.btnSecondary}>
                  Sign In
                </Link>
              </>
            )}
          </div>

          <div style={styles.heroTrust}>
            <div style={styles.trustItem}>
              <strong style={styles.trustValue}>6</strong>
              <span style={styles.trustLabel}>Ministries Connected</span>
            </div>
            <div style={styles.trustDivider} />
            <div style={styles.trustItem}>
              <strong style={styles.trustValue}>24/7</strong>
              <span style={styles.trustLabel}>Online Access</span>
            </div>
            <div style={styles.trustDivider} />
            <div style={styles.trustItem}>
              <strong style={styles.trustValue}>100%</strong>
              <span style={styles.trustLabel}>Secure & Private</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          ABOUT
          ============================================================ */}
      <section style={styles.about}>
        <div style={styles.aboutInner}>
          <p style={styles.sectionEyebrow}>About This System</p>
          <h2 style={styles.sectionTitle}>
            One Citizen Profile. Every Government Service.
          </h2>
          <p style={styles.sectionText}>
            The Integrated Government Services System of Lesotho connects the
            Ministry of Home Affairs, Passport Services, Traffic, Finance,
            Pensions, and the Lesotho Mounted Police Service into one secure
            digital ecosystem.
          </p>
          <p style={styles.sectionText}>
            Instead of visiting multiple offices and submitting the same
            documents again and again, citizens can now apply, pay, book
            appointments, and track every request from a single verified
            account.
          </p>

          <div style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <div key={feature.title} style={styles.featureCard}>
                <span style={styles.featureIcon}>{feature.icon}</span>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDesc}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          MINISTRIES
          ============================================================ */}
      <section style={styles.ministries}>
        <div style={styles.ministriesInner}>
          <p style={styles.sectionEyebrow}>Choose Your Ministry</p>
          <h2 style={styles.sectionTitle}>
            Which service do you need today?
          </h2>
          <p style={styles.sectionSubtitle}>
            Select a ministry below to log in or create an account and access
            its services.
          </p>

          <div style={styles.ministriesGrid}>
            {MINISTRIES.map((ministry) => (
              <button
                key={ministry.id}
                onClick={() => handleMinistryClick(ministry)}
                style={{
                  ...styles.ministryCard,
                  borderTop: `4px solid ${ministry.color}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 32px rgba(0, 32, 159, 0.14)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0, 32, 159, 0.06)";
                }}
              >
                <span style={styles.ministryIcon}>{ministry.icon}</span>
                <h3 style={styles.ministryName}>{ministry.name}</h3>
                <p style={styles.ministryDesc}>{ministry.description}</p>
                <span style={{ ...styles.ministryCta, color: ministry.color }}>
                  Open services →
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA BANNER
          ============================================================ */}
      {!isAuthenticated && (
        <section style={styles.ctaBanner}>
          <div style={styles.ctaBannerInner}>
            <h2 style={styles.ctaBannerTitle}>Ready to get started?</h2>
            <p style={styles.ctaBannerText}>
              Create your free account in under a minute and access all
              government services from one place.
            </p>
            <div style={styles.ctaBannerButtons}>
              <Link to="/register" style={styles.btnPrimaryGreen}>
                Create Account
                <span style={{ marginLeft: 8 }}>→</span>
              </Link>
              <Link to="/login" style={styles.btnOutlineGreen}>
                Sign In
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// ============================================================
// INLINE STYLES
// ============================================================
const styles = {
  page: {
    fontFamily: "Arial, Helvetica, sans-serif",
    color: COLORS.textDark,
    background: COLORS.white
  },

  // ------------------------------------------------------------
  // HERO
  // ------------------------------------------------------------
  hero: {
    background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.blueDark} 100%)`,
    color: "#fff",
    paddingBottom: 80
  },
  flagStripe: {
    display: "flex",
    height: 6
  },
  heroContent: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "80px 24px 0",
    textAlign: "center"
  },
  heroBadge: {
    display: "inline-block",
    padding: "8px 16px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    marginBottom: 24,
    color: "#fff"
  },
  heroTitle: {
    margin: "0 0 24px",
    fontSize: "clamp(32px, 5vw, 56px)",
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: "-1px"
  },
  heroSubtitle: {
    maxWidth: 720,
    margin: "0 auto 36px",
    fontSize: 17,
    lineHeight: 1.65,
    color: "rgba(255,255,255,0.85)"
  },
  heroCTA: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
    marginBottom: 56
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "14px 28px",
    background: "#fff",
    color: COLORS.blue,
    textDecoration: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    border: 0,
    cursor: "pointer",
    fontFamily: "inherit"
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "14px 28px",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)",
    textDecoration: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700
  },
  heroTrust: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
    paddingTop: 32,
    borderTop: "1px solid rgba(255,255,255,0.15)"
  },
  trustItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4
  },
  trustValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#fff"
  },
  trustLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  trustDivider: {
    width: 1,
    height: 32,
    background: "rgba(255,255,255,0.2)"
  },

  // ------------------------------------------------------------
  // ABOUT
  // ------------------------------------------------------------
  about: {
    background: COLORS.white,
    padding: "80px 24px"
  },
  aboutInner: {
    maxWidth: 1120,
    margin: "0 auto",
    textAlign: "center"
  },
  sectionEyebrow: {
    margin: "0 0 12px",
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  sectionTitle: {
    margin: "0 0 20px",
    fontSize: "clamp(26px, 3.5vw, 36px)",
    fontWeight: 700,
    color: COLORS.textDark,
    lineHeight: 1.2,
    letterSpacing: "-0.5px"
  },
  sectionText: {
    maxWidth: 720,
    margin: "0 auto 16px",
    fontSize: 15,
    lineHeight: 1.75,
    color: COLORS.textMid
  },
  sectionSubtitle: {
    maxWidth: 640,
    margin: "0 auto 40px",
    fontSize: 15,
    lineHeight: 1.6,
    color: COLORS.textMuted
  },
  featuresGrid: {
    marginTop: 48,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20,
    textAlign: "left"
  },
  featureCard: {
    padding: "24px 22px",
    background: COLORS.lightBg,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    borderLeft: `4px solid ${COLORS.green}`
  },
  featureIcon: {
    fontSize: 28,
    display: "block",
    marginBottom: 12
  },
  featureTitle: {
    margin: "0 0 8px",
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.blue
  },
  featureDesc: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.6,
    color: COLORS.textMuted
  },

  // ------------------------------------------------------------
  // MINISTRIES
  // ------------------------------------------------------------
  ministries: {
    background: COLORS.lightBg,
    padding: "80px 24px"
  },
  ministriesInner: {
    maxWidth: 1120,
    margin: "0 auto",
    textAlign: "center"
  },
  ministriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
    textAlign: "left"
  },
  ministryCard: {
    display: "flex",
    flexDirection: "column",
    padding: "26px 24px 22px",
    background: "#fff",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0, 32, 159, 0.06)",
    transition: "all 0.2s ease",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit"
  },
  ministryIcon: {
    fontSize: 32,
    display: "block",
    marginBottom: 14
  },
  ministryName: {
    margin: "0 0 8px",
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.blue
  },
  ministryDesc: {
    margin: "0 0 18px",
    fontSize: 13,
    lineHeight: 1.6,
    color: COLORS.textMuted,
    flexGrow: 1
  },
  ministryCta: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.3
  },

  // ------------------------------------------------------------
  // CTA BANNER
  // ------------------------------------------------------------
  ctaBanner: {
    background: COLORS.green,
    color: "#fff",
    padding: "64px 24px"
  },
  ctaBannerInner: {
    maxWidth: 800,
    margin: "0 auto",
    textAlign: "center"
  },
  ctaBannerTitle: {
    margin: "0 0 12px",
    fontSize: "clamp(24px, 3vw, 32px)",
    fontWeight: 700,
    letterSpacing: "-0.5px"
  },
  ctaBannerText: {
    margin: "0 0 32px",
    fontSize: 15,
    lineHeight: 1.6,
    color: "rgba(255,255,255,0.9)"
  },
  ctaBannerButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center"
  },
  btnPrimaryGreen: {
    display: "inline-flex",
    alignItems: "center",
    padding: "14px 28px",
    background: "#fff",
    color: COLORS.green,
    textDecoration: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700
  },
  btnOutlineGreen: {
    display: "inline-flex",
    alignItems: "center",
    padding: "14px 28px",
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.5)",
    textDecoration: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700
  }
};

export default HomeDashboard;
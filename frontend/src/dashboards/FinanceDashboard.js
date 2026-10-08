import React from "react";
import {
  COLORS,
  layout,
  header,
  cards,
  grids,
  section
} from "../styles/dashboardStyles";

const SERVICES = [
  {
    icon: "💰",
    title: "Government payments",
    description: "Process and track payments to service providers, contractors and citizens."
  },
  {
    icon: "📊",
    title: "Budget monitoring",
    description: "Monitor ministry budgets, expenditure and variances across departments."
  },
  {
    icon: "🧾",
    title: "Tax refunds",
    description: "Process tax refunds and reconcile with Revenue Services Lesotho (RSL)."
  },
  {
    icon: "🏦",
    title: "Vendor verification",
    description: "Verify vendor details, banking information and IFMIS registration."
  },
  {
    icon: "📑",
    title: "Procurement",
    description: "Manage tenders, supplier databases and procurement records."
  },
  {
    icon: "🔍",
    title: "Audit and compliance",
    description: "Review financial transactions and ensure compliance with regulations."
  }
];

const METRICS = [
  { label: "Pending payments", value: "18" },
  { label: "Total value (M)", value: "4.2M" },
  { label: "Refunds this month", value: "47" },
  { label: "Exceptions flagged", value: "3" }
];

function FinanceDashboard() {
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
              <p style={header.eyebrow}>Ministry of Finance</p>
              <h1 style={header.title}>Finance Dashboard</h1>
              <p style={header.subtitle}>
                Payments, tax refunds, procurement and financial oversight · {today}
              </p>
            </div>
            <span style={header.liveBadge}>
              <span style={header.liveDot} />
              Treasury operational
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
        <section style={grids.metrics} aria-label="Finance summary">
          {METRICS.map((metric) => (
            <article key={metric.label} style={cards.metric}>
              <p style={cards.metricLabel}>{metric.label}</p>
              <p style={cards.metricValue}>{metric.value}</p>
            </article>
          ))}
        </section>

        {/* ============================================================
            SERVICES
            ============================================================ */}
        <section>
          <h2 style={section.title}>Finance operations</h2>
          <p style={section.subtitle}>
            Core services managed by the Ministry of Finance.
          </p>
          <div style={grids.services}>
            {SERVICES.map((service) => (
              <article
                key={service.title}
                style={{
                  ...cards.cardPadded,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <span style={{ fontSize: 26 }} aria-hidden="true">
                  {service.icon}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: COLORS.blue
                  }}
                >
                  {service.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: COLORS.textMuted
                  }}
                >
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default FinanceDashboard;
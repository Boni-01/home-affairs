import React from "react";
import { COLORS, layout, header } from "../styles/dashboardStyles";

const SERVICES = [
  {
    icon: "📝",
    title: "Crime reports",
    description: "Report theft, assault, fraud, burglary, and other incidents, or ask how to follow up on a case.",
    detail: "Share when and where it happened, what was involved, and any available evidence or witness details. Ask for a reference number and how to receive updates."
  },
  {
    icon: "🚨",
    title: "Emergency assistance",
    description: "For an immediate threat or urgent danger, contact your local emergency number or police station by phone.",
    detail: "Give your location first, describe the immediate risk, and follow the operator's instructions. Do not use this information page to request urgent help."
  },
  {
    icon: "🤝",
    title: "Domestic violence support",
    description: "Seek help, safety guidance, and information about protection and referral services.",
    detail: "Ask to speak privately with an officer about reporting options, safety planning, protection processes, and local support organisations. In immediate danger, call emergency services."
  },
  {
    icon: "🚗",
    title: "Traffic incidents",
    description: "Report road accidents and other traffic-related incidents, and ask about the reporting process.",
    detail: "Be ready to provide the location and time, vehicles involved, and whether anyone is injured. Ask what forms, photographs, or insurance-related documents are required."
  },
  {
    icon: "🪪",
    title: "Clearance and fingerprints",
    description: "Enquire about police clearance checks, fingerprinting, appointments, and required documents.",
    detail: "Confirm eligibility, fees, appointment requirements, processing times, and accepted identification before visiting. Requirements vary by service and location."
  },
  {
    icon: "🔎",
    title: "Lost and found property",
    description: "Report lost property or find out how to claim an item recovered by the police.",
    detail: "Describe the item and where it was lost or found. For a claim, ask what proof of ownership and identification to bring, and whether a report or reference number is needed."
  },
  {
    icon: "🧭",
    title: "Missing persons",
    description: "Report a missing person or provide information that could help locate someone.",
    detail: "Provide a recent photograph, a clear description, last known location and time, and any relevant circumstances. Contact police promptly; you do not need to wait a set period to report someone missing."
  },
  {
    icon: "💬",
    title: "Victim and witness support",
    description: "Ask about giving a statement, available support, and referrals to community services.",
    detail: "Ask how to arrange a statement, what to expect during the process, and whether interpretation, accessibility, or a support person can be arranged."
  },
  {
    icon: "🏘️",
    title: "Community safety",
    description: "Get information about crime prevention, neighbourhood initiatives, and community policing.",
    detail: "Ask about local meetings, neighbourhood watch guidance, prevention resources, and the appropriate way to share non-urgent community concerns."
  },
  {
    icon: "📄",
    title: "Documents and enquiries",
    description: "Check station procedures, case-related enquiries, and which documents to bring for a service.",
    detail: "When enquiring about a case, have its reference number and relevant dates available. Confirm office hours, appointment needs, identification, and document requirements in advance."
  }
];

function PoliceDashboard() {
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
            HERO HEADER (with gradient)
            ============================================================ */}
        <header
          style={{
            background: `linear-gradient(120deg, ${COLORS.blue} 0%, #176b8a 100%)`,
            borderRadius: 14,
            padding: "32px 36px",
            color: "#fff",
            marginBottom: 20,
            boxShadow: "0 12px 30px rgba(0, 32, 159, 0.14)"
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#b9e7f2",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase"
            }}
          >
            Community safety · Public services
          </p>
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(26px, 4vw, 34px)",
              lineHeight: 1.15
            }}
          >
            Police Station Services
          </h1>
          <p
            style={{
              maxWidth: 700,
              margin: 0,
              color: "#e1edf5",
              fontSize: 15,
              lineHeight: 1.6
            }}
          >
            Find common services and support available through your local police
            station. Contact the station to confirm availability, hours, and what
            to bring.
          </p>
        </header>

        {/* ============================================================
            EMERGENCY ALERT
            ============================================================ */}
        <aside
          role="note"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 28,
            padding: "16px 20px",
            border: "1px solid #f0d28b",
            borderRadius: 12,
            background: "#fff9e9",
            color: "#654b12",
            lineHeight: 1.5,
            fontSize: 13
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>⚠️</span>
          <span>
            <strong style={{ color: "#92400e" }}>Immediate danger?</strong>{" "}
            Call your local emergency number. This page provides service
            information and is not an emergency reporting channel.
          </span>
        </aside>

        {/* ============================================================
            SERVICES GRID
            ============================================================ */}
        <section>
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.textDark
            }}
          >
            How the station can help
          </h2>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13,
              color: COLORS.textMuted,
              lineHeight: 1.5
            }}
          >
            Review the guidance below, then contact your local station to
            confirm the right process and any location-specific requirements.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16
            }}
          >
            {SERVICES.map((service) => (
              <article
                key={service.title}
                style={{
                  minHeight: 170,
                  padding: 22,
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(0, 32, 159, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <span style={{ fontSize: 24 }} aria-hidden="true">
                  {service.icon}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
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
                    color: COLORS.textMid
                  }}
                >
                  {service.description}
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    paddingTop: 10,
                    borderTop: `1px solid ${COLORS.borderLight}`,
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: COLORS.textMuted
                  }}
                >
                  {service.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ============================================================
            FOOTER NOTE
            ============================================================ */}
        <p
          style={{
            marginTop: 28,
            fontSize: 12,
            color: COLORS.textMuted,
            lineHeight: 1.6,
            fontStyle: "italic"
          }}
        >
          Services and procedures vary by location. Contact your local station
          to confirm what is offered and any requirements before visiting.
        </p>
      </div>
    </main>
  );
}

export default PoliceDashboard;
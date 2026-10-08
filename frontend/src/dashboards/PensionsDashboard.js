import React, { useState } from "react";
import {
  COLORS,
  layout,
  header,
  cards,
  grids,
  section
} from "../styles/dashboardStyles";

const SERVICES = [
  ["Pension applications", "Apply for eligible pension benefits and follow up on an application."],
  ["Payments and payment history", "Ask about payment dates, missing or delayed payments, and payment history."],
  ["Benefit statements and calculations", "Request a pension statement, benefit amount breakdown, or income confirmation."],
  ["Bank and contact details", "Request updates to contact information or the bank account used for payments."],
  ["Life certificates", "Submit or follow up on a life certificate required to maintain payments."],
  ["Survivor and dependant benefits", "Enquire about or follow up on eligible survivor and dependant claims."],
  ["Funeral benefits", "Check eligibility and follow up on funeral assistance claims, where offered."],
  ["Deductions and tax documents", "Ask about benefit deductions and request available tax or payment documents."],
  ["Appeals, complaints, and corrections", "Dispute a decision, report a problem, or request a correction to your record."],
  ["Pensioner verification", "Request available proof of pensioner status or benefit documentation."]
];

function PensionsDashboard() {
  const [idNumber, setIdNumber] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "info" | "success" | "error"

  const handleTrack = (event) => {
    event.preventDefault();
    if (!idNumber.trim()) {
      setMessage("Please enter your ID number to track a pension service.");
      setMessageType("error");
      return;
    }
    setMessage(
      "Your ID number is ready for a pension-record lookup. Live application and payment status requires connection to the pension office records system."
    );
    setMessageType("success");
  };

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
          <div style={header.content}>
            <p style={header.eyebrow}>Pension Office · Public Services</p>
            <h1 style={header.title}>Pensions Dashboard</h1>
            <p style={header.subtitle}>
              Access pension services and track applications, claims and payment enquiries · {today}
            </p>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        {/* ============================================================
            TRACKING SECTION
            ============================================================ */}
        <section style={{ ...cards.cardPadded, marginBottom: 28 }}>
          <h2 style={section.title}>Track a pension service</h2>
          <p style={section.subtitle}>
            Enter your ID number to check the status of your pension application or payment enquiry.
          </p>

          <form onSubmit={handleTrack}>
            <label
              htmlFor="pension-id"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.textMid
              }}
            >
              ID number
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "stretch"
              }}
            >
              <input
                id="pension-id"
                name="idNumber"
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                autoComplete="off"
                required
                placeholder="e.g. 901019088"
                style={{
                  flex: "1 1 240px",
                  padding: "12px 14px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none"
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "12px 24px",
                  background: COLORS.blue,
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                Track request
              </button>
            </div>
          </form>

          {message && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 8,
                background:
                  messageType === "error"
                    ? "#fdecea"
                    : messageType === "success"
                    ? COLORS.greenLight
                    : COLORS.blueLight,
                color:
                  messageType === "error"
                    ? COLORS.error
                    : messageType === "success"
                    ? COLORS.greenDark
                    : COLORS.blue,
                fontSize: 13,
                lineHeight: 1.5,
                borderLeft: `4px solid ${
                  messageType === "error"
                    ? COLORS.error
                    : messageType === "success"
                    ? COLORS.green
                    : COLORS.blue
                }`
              }}
            >
              {message}
            </div>
          )}
        </section>

        {/* ============================================================
            SERVICES
            ============================================================ */}
        <section>
          <h2 style={section.title}>Pension office services</h2>
          <p style={section.subtitle}>
            Select a service below to learn more. Use your ID number above to follow up.
          </p>
          <div style={grids.services}>
            {SERVICES.map(([title, description]) => (
              <article
                key={title}
                style={{
                  ...cards.cardPadded,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: COLORS.blue
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: COLORS.textMuted
                  }}
                >
                  {description}
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    paddingTop: 10,
                    borderTop: `1px solid ${COLORS.borderLight}`,
                    fontSize: 12,
                    color: COLORS.textMid
                  }}
                >
                  <strong style={{ color: COLORS.textDark }}>Tracking:</strong>{" "}
                  Use your ID number above to follow up.
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default PensionsDashboard;
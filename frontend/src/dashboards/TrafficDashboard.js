import React, { useState } from "react";
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

const INITIAL_FINES = [
  { id: "TF-98214", name: "Naledi Mokoena", vehicle: "LEH 482 GP", offence: "Speeding", date: "12 Jun 2025", amount: 750, status: "Unpaid" },
  { id: "TF-98208", name: "Thabo Nkosi", vehicle: "JZK 113 GP", offence: "Parking violation", date: "10 Jun 2025", amount: 450, status: "Unpaid" },
  { id: "TF-98177", name: "Mpho Dlamini", vehicle: "KLM 908 GP", offence: "Expired licence disc", date: "06 Jun 2025", amount: 300, status: "Paid" }
];

const APPLICATIONS = [
  { id: "APP-24018", name: "Naledi Mokoena", service: "Driving licence renewal", date: "18 Jun 2025", status: "Under review" },
  { id: "APP-24019", name: "Thabo Nkosi", service: "Learner's licence", date: "19 Jun 2025", status: "Documents required" },
  { id: "APP-24020", name: "Mpho Dlamini", service: "Vehicle registration", date: "20 Jun 2025", status: "Approved" },
  { id: "APP-24021", name: "Lerato Molefe", service: "Driving licence application", date: "21 Jun 2025", status: "Under review" },
  { id: "APP-24022", name: "Kagiso Khumalo", service: "Vehicle licence disc renewal", date: "22 Jun 2025", status: "Documents required" },
  { id: "APP-24023", name: "Amara Dube", service: "Duplicate driving licence card", date: "23 Jun 2025", status: "Under review" },
  { id: "APP-24024", name: "Palesa Radebe", service: "Vehicle ownership transfer", date: "24 Jun 2025", status: "Approved" },
  { id: "APP-24025", name: "Tumelo Maseko", service: "Vehicle registration", date: "25 Jun 2025", status: "Under review" }
];

const CLEARANCES = [
  { id: "CLR-6104", name: "Naledi Mokoena", reference: "LEH 482 GP", date: "20 Jun 2025", status: "Pending fine payment" },
  { id: "CLR-6103", name: "Mpho Dlamini", reference: "KLM 908 GP", date: "19 Jun 2025", status: "Cleared" },
  { id: "CLR-6101", name: "Thabo Nkosi", reference: "JZK 113 GP", date: "18 Jun 2025", status: "In progress" }
];

function TrafficDashboard() {
  const [fines, setFines] = useState(INITIAL_FINES);
  const [query, setQuery] = useState("");

  const matchesSearch = (item) =>
    Object.values(item).join(" ").toLowerCase().includes(query.trim().toLowerCase());

  const visibleApplications = APPLICATIONS.filter(matchesSearch);
  const visibleClearances = CLEARANCES.filter(matchesSearch);
  const visibleFines = fines.filter(matchesSearch);

  const unpaidFines = fines.filter((f) => f.status === "Unpaid");
  const totalDue = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

  const recordPayment = (fineId) => {
    setFines((items) =>
      items.map((item) =>
        item.id === fineId ? { ...item, status: "Paid" } : item
      )
    );
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
              <p style={header.eyebrow}>Traffic Office · Operations</p>
              <h1 style={header.title}>Traffic Dashboard</h1>
              <p style={header.subtitle}>
                Manage licence services, clearance requests and traffic fines · {today}
              </p>
            </div>
            <input
              aria-label="Search traffic records"
              placeholder="Search records…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                padding: "10px 14px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontSize: 13,
                minWidth: 220,
                fontFamily: "inherit",
                outline: "none"
              }}
            />
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
        <section style={grids.metrics} aria-label="Traffic office summary">
          <MetricCard label="Applications" value={APPLICATIONS.length} />
          <MetricCard label="Clearance requests" value={CLEARANCES.length} />
          <MetricCard label="Unpaid fines" value={unpaidFines.length} />
          <MetricCard label="Fine balance due" value={`M ${totalDue.toLocaleString()}`} />
        </section>

        {/* ============================================================
            LICENCE CLEARANCE
            ============================================================ */}
        <section style={{ ...cards.cardPadded, ...section.wrapper }}>
          <h2 style={section.title}>Licence clearance</h2>
          <p style={section.subtitle}>
            Review clearance requests and verify outstanding fines before approval.
          </p>
          <div style={tables.wrapper}>
            <table style={tables.table}>
              <thead>
                <tr>
                  <th style={tables.th}>Request</th>
                  <th style={tables.th}>Applicant</th>
                  <th style={tables.th}>Licence / Vehicle</th>
                  <th style={tables.th}>Requested</th>
                  <th style={tables.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleClearances.length === 0 ? (
                  <tr>
                    <td style={tables.td} colSpan={5}>
                      No clearance requests match your search.
                    </td>
                  </tr>
                ) : (
                  visibleClearances.map((item) => {
                    const statusStyle = getStatusStyle(item.status);
                    return (
                      <tr key={item.id}>
                        <td style={{ ...tables.td, ...tables.tdFirst }}>{item.id}</td>
                        <td style={tables.td}>{item.name}</td>
                        <td style={tables.td}>{item.reference}</td>
                        <td style={tables.td}>{item.date}</td>
                        <td style={tables.td}>
                          <StatusBadge status={item.status} style={statusStyle} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============================================================
            LICENCE & VEHICLE APPLICATIONS
            ============================================================ */}
        <section style={{ ...cards.cardPadded, ...section.wrapper }}>
          <h2 style={section.title}>Licence and vehicle applications</h2>
          <p style={section.subtitle}>
            Application references, submission dates and processing status.
          </p>
          <div style={tables.wrapper}>
            <table style={tables.table}>
              <thead>
                <tr>
                  <th style={tables.th}>Reference</th>
                  <th style={tables.th}>Applicant</th>
                  <th style={tables.th}>Service</th>
                  <th style={tables.th}>Submitted</th>
                  <th style={tables.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleApplications.length === 0 ? (
                  <tr>
                    <td style={tables.td} colSpan={5}>
                      No applications match your search.
                    </td>
                  </tr>
                ) : (
                  visibleApplications.map((item) => {
                    const statusStyle = getStatusStyle(item.status);
                    return (
                      <tr key={item.id}>
                        <td style={{ ...tables.td, ...tables.tdFirst }}>{item.id}</td>
                        <td style={tables.td}>{item.name}</td>
                        <td style={tables.td}>{item.service}</td>
                        <td style={tables.td}>{item.date}</td>
                        <td style={tables.td}>
                          <StatusBadge status={item.status} style={statusStyle} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============================================================
            TRAFFIC FINES
            ============================================================ */}
        <section style={{ ...cards.cardPadded, ...section.wrapper }}>
          <h2 style={section.title}>Traffic fines due</h2>
          <p style={section.subtitle}>
            View offence details, amounts due and record received payments.
          </p>
          <div style={tables.wrapper}>
            <table style={tables.table}>
              <thead>
                <tr>
                  <th style={tables.th}>Fine reference</th>
                  <th style={tables.th}>Driver</th>
                  <th style={tables.th}>Vehicle</th>
                  <th style={tables.th}>Offence</th>
                  <th style={tables.th}>Date</th>
                  <th style={tables.th}>Amount due</th>
                  <th style={tables.th}>Status</th>
                  <th style={tables.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleFines.length === 0 ? (
                  <tr>
                    <td style={tables.td} colSpan={8}>
                      No fines match your search.
                    </td>
                  </tr>
                ) : (
                  visibleFines.map((fine) => {
                    const statusStyle = getStatusStyle(fine.status);
                    return (
                      <tr key={fine.id}>
                        <td style={{ ...tables.td, ...tables.tdFirst }}>{fine.id}</td>
                        <td style={tables.td}>{fine.name}</td>
                        <td style={tables.td}>{fine.vehicle}</td>
                        <td style={tables.td}>{fine.offence}</td>
                        <td style={tables.td}>{fine.date}</td>
                        <td style={tables.td}>
                          M {fine.status === "Unpaid" ? fine.amount.toLocaleString() : "0"}
                        </td>
                        <td style={tables.td}>
                          <StatusBadge status={fine.status} style={statusStyle} />
                        </td>
                        <td style={tables.td}>
                          {fine.status === "Unpaid" ? (
                            <button
                              type="button"
                              onClick={() => recordPayment(fine.id)}
                              style={{
                                padding: "7px 12px",
                                border: 0,
                                borderRadius: 6,
                                background: COLORS.blue,
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: "inherit"
                              }}
                            >
                              Record payment
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 11,
              color: COLORS.textMuted,
              fontStyle: "italic"
            }}
          >
            Demonstration records only. Verify payments and clearance eligibility
            with the official traffic system.
          </p>
        </section>
      </div>
    </main>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function MetricCard({ label, value }) {
  return (
    <article style={cards.metric}>
      <p style={cards.metricLabel}>{label}</p>
      <p style={cards.metricValue}>{value}</p>
    </article>
  );
}

function StatusBadge({ status, style }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.3,
        color: style.color,
        background: style.background
      }}
    >
      {status}
    </span>
  );
}

export default TrafficDashboard;
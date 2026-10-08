import { useState } from "react";

const applications = [
  { id: "APP-24018", name: "Naledi Mokoena", service: "Driving licence renewal", date: "18 Jun 2025", status: "Under review" },
  { id: "APP-24019", name: "Thabo Nkosi", service: "Learner's licence", date: "19 Jun 2025", status: "Documents required" },
  { id: "APP-24020", name: "Mpho Dlamini", service: "Vehicle registration", date: "20 Jun 2025", status: "Approved" },
  { id: "APP-24021", name: "Lerato Molefe", service: "Driving licence application", date: "21 Jun 2025", status: "Under review" },
  { id: "APP-24022", name: "Kagiso Khumalo", service: "Vehicle licence disc renewal", date: "22 Jun 2025", status: "Documents required" },
  { id: "APP-24023", name: "Amara Dube", service: "Duplicate driving licence card", date: "23 Jun 2025", status: "Under review" },
  { id: "APP-24024", name: "Palesa Radebe", service: "Vehicle ownership transfer", date: "24 Jun 2025", status: "Approved" },
  { id: "APP-24025", name: "Tumelo Maseko", service: "Vehicle registration", date: "25 Jun 2025", status: "Under review" },
];

const clearanceRequests = [
  { id: "CLR-6104", name: "Naledi Mokoena", reference: "LEH 482 GP", date: "20 Jun 2025", status: "Pending fine payment" },
  { id: "CLR-6103", name: "Mpho Dlamini", reference: "KLM 908 GP", date: "19 Jun 2025", status: "Cleared" },
  { id: "CLR-6101", name: "Thabo Nkosi", reference: "JZK 113 GP", date: "18 Jun 2025", status: "In progress" },
];

const startingFines = [
  { id: "TF-98214", name: "Naledi Mokoena", vehicle: "LEH 482 GP", offence: "Speeding", date: "12 Jun 2025", amount: 750, status: "Unpaid" },
  { id: "TF-98208", name: "Thabo Nkosi", vehicle: "JZK 113 GP", offence: "Parking violation", date: "10 Jun 2025", amount: 450, status: "Unpaid" },
  { id: "TF-98177", name: "Mpho Dlamini", vehicle: "KLM 908 GP", offence: "Expired licence disc", date: "06 Jun 2025", amount: 300, status: "Paid" },
];

const styles = {
  page: { minHeight: "100vh", padding: 32, background: "#f4f7fb", color: "#182230", fontFamily: "Arial, sans-serif", boxSizing: "border-box" },
  content: { maxWidth: 1180, margin: "0 auto" },
  card: { background: "#fff", border: "1px solid #e4eaf1", borderRadius: 12, padding: 20, marginTop: 20 },
  muted: { color: "#667085", fontSize: 14 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 },
  th: { color: "#667085", fontWeight: 600, borderBottom: "1px solid #e4eaf1", padding: "12px 10px", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eef1f5", padding: "13px 10px", whiteSpace: "nowrap" },
};

function Status({ value }) {
  const good = ["Paid", "Approved", "Cleared"].includes(value);
  const caution = ["Unpaid", "Pending fine payment", "Documents required"].includes(value);
  const color = good ? ["#067647", "#ecfdf3"] : caution ? ["#b54708", "#fffaeb"] : ["#175cd3", "#eff8ff"];
  return <span style={{ color: color[0], background: color[1], borderRadius: 20, padding: "5px 9px", fontSize: 12, fontWeight: 600 }}>{value}</span>;
}

function TrafficDashboard() {
  const [fines, setFines] = useState(startingFines);
  const [query, setQuery] = useState("");
  const search = (item) => Object.values(item).join(" ").toLowerCase().includes(query.trim().toLowerCase());
  const visibleApplications = applications.filter(search);
  const visibleClearances = clearanceRequests.filter(search);
  const visibleFines = fines.filter(search);
  const unpaid = fines.filter((fine) => fine.status === "Unpaid");
  const dueTotal = unpaid.reduce((sum, fine) => sum + fine.amount, 0);

  const renderTable = (headers, rows, emptyMessage) => (
    <div style={styles.tableWrap}><table style={styles.table}>
      <thead><tr>{headers.map((heading) => <th key={heading} style={styles.th}>{heading}</th>)}</tr></thead>
      <tbody>{rows.length ? rows : <tr><td style={styles.td} colSpan={headers.length}>{emptyMessage}</td></tr>}</tbody>
    </table></div>
  );

  return (
    <main style={styles.page}>
      <div style={styles.content}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div><p style={{ ...styles.muted, margin: "0 0 6px" }}>TRAFFIC OFFICE · OPERATIONS</p><h1 style={{ margin: 0, fontSize: 28 }}>Traffic Dashboard</h1><p style={{ ...styles.muted, margin: "8px 0 0" }}>Manage licence services, clearance requests and traffic fines.</p></div>
          <input aria-label="Search traffic records" placeholder="Search records…" value={query} onChange={(event) => setQuery(event.target.value)} style={{ border: "1px solid #d0d5dd", borderRadius: 8, padding: "10px 12px", fontSize: 14, minWidth: 220 }} />
        </header>

        <section aria-label="Traffic office summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 24 }}>
          {[["Applications", applications.length], ["Clearance requests", clearanceRequests.length], ["Unpaid fines", unpaid.length], ["Fine balance due", `R ${dueTotal.toLocaleString()}`]].map(([label, value]) => (
            <article key={label} style={{ ...styles.card, marginTop: 0 }}><p style={{ ...styles.muted, margin: "0 0 8px" }}>{label}</p><strong style={{ fontSize: 26 }}>{value}</strong></article>
          ))}
        </section>

        <section style={styles.card}>
          <h2 style={{ fontSize: 18, margin: "0 0 5px" }}>Licence clearance</h2><p style={{ ...styles.muted, margin: "0 0 14px" }}>Review clearance requests and verify outstanding fines before approval.</p>
          {renderTable(["Request", "Applicant", "Licence / vehicle", "Requested", "Status"], visibleClearances.map((item) => <tr key={item.id}><td style={styles.td}>{item.id}</td><td style={styles.td}>{item.name}</td><td style={styles.td}>{item.reference}</td><td style={styles.td}>{item.date}</td><td style={styles.td}><Status value={item.status} /></td></tr>), "No clearance requests match your search.")}
        </section>

        <section style={styles.card}>
          <h2 style={{ fontSize: 18, margin: "0 0 5px" }}>Licence and vehicle applications</h2><p style={{ ...styles.muted, margin: "0 0 14px" }}>Application references, submission dates and processing status.</p>
          {renderTable(["Reference", "Applicant", "Service", "Submitted", "Status"], visibleApplications.map((item) => <tr key={item.id}><td style={styles.td}>{item.id}</td><td style={styles.td}>{item.name}</td><td style={styles.td}>{item.service}</td><td style={styles.td}>{item.date}</td><td style={styles.td}><Status value={item.status} /></td></tr>), "No applications match your search.")}
        </section>

        <section style={styles.card}>
          <h2 style={{ fontSize: 18, margin: "0 0 5px" }}>Traffic fines due</h2><p style={{ ...styles.muted, margin: "0 0 14px" }}>View offence details, amounts due and record received payments.</p>
          {renderTable(["Fine reference", "Driver", "Vehicle", "Offence", "Date", "Amount due", "Status", "Action"], visibleFines.map((fine) => <tr key={fine.id}><td style={styles.td}>{fine.id}</td><td style={styles.td}>{fine.name}</td><td style={styles.td}>{fine.vehicle}</td><td style={styles.td}>{fine.offence}</td><td style={styles.td}>{fine.date}</td><td style={styles.td}>R {fine.status === "Unpaid" ? fine.amount.toLocaleString() : "0"}</td><td style={styles.td}><Status value={fine.status} /></td><td style={styles.td}>{fine.status === "Unpaid" ? <button type="button" onClick={() => setFines((items) => items.map((item) => item.id === fine.id ? { ...item, status: "Paid" } : item))} style={{ border: 0, borderRadius: 7, padding: "8px 11px", color: "#fff", background: "#175cd3", cursor: "pointer", fontWeight: 600 }}>Record payment</button> : "—"}</td></tr>), "No fines match your search.")}
          <p style={{ ...styles.muted, fontSize: 12, margin: "14px 0 0" }}>Demonstration records only. Verify payments and clearance eligibility with the official traffic system.</p>
        </section>
      </div>
    </main>
  );
}

export default TrafficDashboard;
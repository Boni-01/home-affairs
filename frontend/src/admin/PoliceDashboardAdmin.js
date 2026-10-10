import React, { useEffect, useState, useCallback } from "react";
import { COLORS, layout, header, cards, grids, section } from "../styles/dashboardStyles";
import { auth, API_BASE } from "../Database/firebase";

async function api(path, opts = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const STATUS_FILTERS = [
  { key: "", label: "All statuses" },
  { key: "submitted", label: "Submitted" },
  { key: "received", label: "Received" },
  { key: "under_review", label: "Under review" },
  { key: "more_information_required", label: "More info required" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "referred", label: "Referred" },
  { key: "in_progress", label: "In progress" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "ready_for_collection", label: "Ready for collection" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" }
];

const TYPE_FILTERS = [
  { key: "", label: "All types" },
  { key: "crime_report", label: "Crime" },
  { key: "theft_report", label: "Theft" },
  { key: "lost_item_report", label: "Lost item" },
  { key: "missing_person_report", label: "Missing person" },
  { key: "fraud_report", label: "Fraud" },
  { key: "cybercrime_report", label: "Cybercrime" },
  { key: "traffic_incident", label: "Traffic incident" },
  { key: "police_clearance", label: "Police clearance" },
  { key: "police_report_request", label: "Police report request" },
  { key: "police_conduct_complaint", label: "Conduct complaint" },
  { key: "witness_information", label: "Witness info" },
  { key: "additional_evidence", label: "Additional evidence" }
];

const URGENCY_FILTERS = [
  { key: "", label: "All urgencies" },
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "normal", label: "Normal" },
  { key: "low", label: "Low" }
];

const URGENCY_COLORS = {
  urgent: "#b3261e",
  high: "#b45309",
  normal: "#175cd3",
  low: "#475569"
};

export default function PoliceDashboardAdmin() {
  const [tab, setTab] = useState("queue");

  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [audit, setAudit] = useState([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const [apptForm, setApptForm] = useState({
    appointment_date: "",
    appointment_type: "statement",
    office_location: "Maseru Police HQ"
  });
  const [apptMsg, setApptMsg] = useState("");

  const [payForm, setPayForm] = useState({
    fee_type: "Police service fee",
    amount: "0",
    payment_method: "cash",
    payment_status: "paid",
    transaction_reference: ""
  });
  const [payMsg, setPayMsg] = useState("");

  // Letters
  const [letters, setLetters] = useState([]);

  // Certified docs
  const [certDocs, setCertDocs] = useState([]);
  const [certDetail, setCertDetail] = useState(null);
  const [certNote, setCertNote] = useState("");
  const [certOfficer, setCertOfficer] = useState("");
  const [certUpdating, setCertUpdating] = useState(false);
  const [certMsg, setCertMsg] = useState("");
  const [certPayForm, setCertPayForm] = useState({
    fee_type: "Certification fee",
    amount: "0",
    payment_method: "cash",
    payment_status: "paid",
    transaction_reference: ""
  });
  const [certPayMsg, setCertPayMsg] = useState("");

  // -------- Loaders --------
  const loadStats = useCallback(async () => {
    try {
      const data = await api("/police/admin/stats");
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter) qs.set("application_type", typeFilter);
      if (urgencyFilter) qs.set("urgency", urgencyFilter);
      const data = await api(`/police/admin/applications?${qs}`);
      setQueue(data.applications || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter, urgencyFilter]);

  const loadFeedback = useCallback(async () => {
    try {
      const data = await api("/police/admin/feedback");
      setFeedback(data.feedback || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const data = await api("/police/admin/audit");
      setAudit(data.logs || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadLetters = useCallback(async () => {
    try {
      const data = await api("/police/admin/letters");
      setLetters(data.letters || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadCertDocs = useCallback(async () => {
    try {
      const data = await api("/police/admin/certified-documents");
      setCertDocs(data.documents || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => {
    if (tab === "feedback") loadFeedback();
    if (tab === "audit") loadAudit();
    if (tab === "letters") loadLetters();
    if (tab === "certify") loadCertDocs();
  }, [tab, loadFeedback, loadAudit, loadLetters, loadCertDocs]);

  // -------- Application actions --------
  async function openApplication(id) {
    try {
      const data = await api(`/police/applications/${id}`);
      setSelected(data.application);
      setDetail(data);
      setNote("");
      setApptMsg(""); setPayMsg("");
    } catch (err) { alert(err.message); }
  }

  async function setStatus(newStatus) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api(`/police/admin/applications/${selected.application_id}/status`, {
        method: "POST",
        body: JSON.stringify({ newStatus, note })
      });
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  }

  async function submitAppointment(e) {
    e.preventDefault();
    setApptMsg("");
    try {
      await api(`/police/admin/applications/${selected.application_id}/appointment`, {
        method: "POST",
        body: JSON.stringify(apptForm)
      });
      setApptMsg("Appointment scheduled.");
      await openApplication(selected.application_id);
    } catch (err) { setApptMsg("Error: " + err.message); }
  }

  async function submitPayment(e) {
    e.preventDefault();
    setPayMsg("");
    try {
      await api(`/police/admin/applications/${selected.application_id}/payment`, {
        method: "POST",
        body: JSON.stringify(payForm)
      });
      setPayMsg("Payment recorded.");
      await openApplication(selected.application_id);
      await loadStats();
    } catch (err) { setPayMsg("Error: " + err.message); }
  }

  async function verifyEvidence(evidenceId, verification_status) {
    try {
      await api(`/police/admin/evidence/${evidenceId}/verify`, {
        method: "POST",
        body: JSON.stringify({ verification_status })
      });
      if (selected) await openApplication(selected.application_id);
    } catch (err) { alert(err.message); }
  }

  // -------- Certified doc actions --------
  async function openCertDoc(id) {
    try {
      const data = await api(`/police/certified-documents/${id}`);
      setCertDetail(data);
      setCertNote("");
      setCertOfficer("");
      setCertMsg("");
      setCertPayMsg("");
    } catch (err) { alert(err.message); }
  }

  async function setCertStatus(newStatus) {
    if (!certDetail) return;
    setCertUpdating(true);
    try {
      await api(`/police/admin/certified-documents/${certDetail.document.certified_doc_id}/status`, {
        method: "POST",
        body: JSON.stringify({ newStatus, note: certNote })
      });
      await openCertDoc(certDetail.document.certified_doc_id);
      await loadCertDocs();
    } catch (err) { alert(err.message); }
    finally { setCertUpdating(false); }
  }

  async function markCertified() {
    if (!certDetail) return;
    setCertUpdating(true);
    setCertMsg("");
    try {
      const res = await api(
        `/police/admin/certified-documents/${certDetail.document.certified_doc_id}/certify`,
        {
          method: "POST",
          body: JSON.stringify({
            certifying_officer: certOfficer || undefined,
            note: certNote || undefined
          })
        }
      );
      setCertMsg(`Certified. File: ${res.certified_filename}`);
      await openCertDoc(certDetail.document.certified_doc_id);
      await loadCertDocs();
    } catch (err) {
      setCertMsg("Error: " + err.message);
    } finally {
      setCertUpdating(false);
    }
  }

  async function submitCertPayment(e) {
    e.preventDefault();
    setCertPayMsg("");
    try {
      await api(`/police/admin/certified-documents/${certDetail.document.certified_doc_id}/payment`, {
        method: "POST",
        body: JSON.stringify(certPayForm)
      });
      setCertPayMsg("Payment recorded.");
      await openCertDoc(certDetail.document.certified_doc_id);
    } catch (err) { setCertPayMsg("Error: " + err.message); }
  }

  const countFor = (key) =>
    stats.byStatus?.find(s => s.status === key)?.count || 0;

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={{
            ...header.content,
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 16, flexWrap: "wrap"
          }}>
            <div>
              <p style={header.eyebrow}>Lesotho Mounted Police Service</p>
              <h1 style={header.title}>Police Admin Dashboard</h1>
              <p style={header.subtitle}>
                Review, categorise, refer and manage police reports
              </p>
            </div>
            <span style={header.liveBadge}>
              <span style={header.liveDot} />
              {countFor("submitted") + countFor("received")} new
            </span>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        <section style={grids.metrics}>
          <Metric label="Total reports" value={stats.totalApplications || 0} />
          <Metric label="Pending" value={stats.pendingApplications || 0} />
          <Metric label="Resolved" value={stats.resolvedApplications || 0} />
          <Metric label="Rejected" value={stats.rejectedApplications || 0} />
          <Metric label="Feedback" value={stats.totalFeedback || 0} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["queue", "Application queue"],
            ["letters", `Letters (${letters.length})`],
            ["certify", `Certified docs (${certDocs.length})`],
            ["feedback", "Feedback"],
            ["audit", "Audit log"]
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "12px 18px", border: 0, background: "transparent",
              borderBottom: tab === key ? `3px solid ${COLORS.blue}` : "3px solid transparent",
              color: tab === key ? COLORS.blue : COLORS.textMid,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit"
            }}>{label}</button>
          ))}
        </nav>

        {/* ================= QUEUE TAB ================= */}
        {tab === "queue" && (
          <section style={grids.twoCol}>
            <article style={cards.cardPadded}>
              <h2 style={section.title}>Queue</h2>
              <p style={section.subtitle}>
                Urgent reports appear first. Click a row to open it.
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
                  {TYPE_FILTERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} style={selectStyle}>
                  {URGENCY_FILTERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
                  {STATUS_FILTERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>

              {loading && <p style={{ color: COLORS.textMuted }}>Loading…</p>}
              {error && <p style={{ color: COLORS.error }}>{error}</p>}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 44 }}></th>
                      {["Ref", "Applicant", "Type", "Urgency", "Status", ""].map(h =>
                        <th key={h} style={thStyle}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {queue.length === 0 && !loading && (
                      <tr><td colSpan={6} style={{
                        padding: 16, color: COLORS.textMuted, fontSize: 13
                      }}>No reports in the queue.</td></tr>
                    )}
                    {queue.map(a => (
                      <tr key={a.application_id}>
                        <td style={{ ...tdStyle, width: 44 }}>
                          {a.photo_url ? (
                            <img src={a.photo_url} alt={a.full_name}
                              style={{
                                width: 34, height: 42, borderRadius: 4,
                                objectFit: "cover", display: "block",
                                border: `1px solid ${COLORS.borderLight}`
                              }} />
                          ) : (
                            <div style={{
                              width: 34, height: 42, borderRadius: 4,
                              background: COLORS.lightBg, border: `1px solid ${COLORS.borderLight}`,
                              display: "grid", placeItems: "center",
                              fontSize: 8, color: COLORS.textMuted
                            }}>N/A</div>
                          )}
                        </td>
                        <td style={tdStyle}><strong>{a.reference_number}</strong></td>
                        <td style={tdStyle}>{a.full_name || "—"}</td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: URGENCY_COLORS[a.urgency],
                            textTransform: "uppercase", letterSpacing: 0.4
                          }}>{a.urgency}</span>
                        </td>
                        <td style={tdStyle}><StatusBadge status={a.status} /></td>
                        <td style={tdStyle}>
                          <button style={linkBtn}
                            onClick={() => openApplication(a.application_id)}>Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside style={cards.cardPadded}>
              {!selected && (
                <>
                  <h2 style={section.title}>Report detail</h2>
                  <p style={section.subtitle}>Select a report from the queue.</p>
                </>
              )}

              {selected && (
                <>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 16, gap: 12
                  }}>
                    <div>
                      <h2 style={{ margin: 0, color: COLORS.blue, fontSize: 16 }}>
                        {selected.reference_number}
                      </h2>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                        {selected.category_name} · {selected.application_type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <div style={{
                    display: "flex", gap: 16, padding: 14, marginBottom: 14,
                    background: COLORS.lightBg, borderRadius: 10,
                    border: `1px solid ${COLORS.borderLight}`, flexWrap: "wrap"
                  }}>
                    <div style={{
                      width: 90, height: 116, borderRadius: 6, overflow: "hidden",
                      border: `1px solid ${COLORS.border}`, background: "#fff",
                      flexShrink: 0, display: "grid", placeItems: "center"
                    }}>
                      {selected.photo_url ? (
                        <img src={selected.photo_url} alt={selected.full_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 10, color: COLORS.textMuted, padding: 6 }}>No photo</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>
                        {selected.full_name}
                      </p>
                      <Row label="National ID" value={selected.national_id || "—"} />
                      <Row label="Email" value={selected.email || "—"} />
                      <Row label="Phone" value={selected.phone || "—"} />
                      <Row label="Urgency" value={
                        <span style={{ color: URGENCY_COLORS[selected.urgency], fontWeight: 700 }}>
                          {selected.urgency}
                        </span>
                      } />
                    </div>
                  </div>

                  <h3 style={subHeading}>Submitted details</h3>
                  {detail?.values?.map((v, i) => (
                    <Row key={i} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
                  ))}

                  {detail?.evidence?.length > 0 && (
                    <>
                      <h3 style={subHeading}>Evidence</h3>
                      {detail.evidence.map(e => (
                        <div key={e.evidence_id} style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", gap: 10, padding: "6px 0",
                          borderBottom: `1px solid ${COLORS.borderLight}`
                        }}>
                          <a href={`${API_BASE.replace("/api", "")}${e.storage_path}`}
                             target="_blank" rel="noreferrer"
                             style={{ color: COLORS.blue, fontSize: 13 }}>
                            {e.original_filename}
                          </a>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => verifyEvidence(e.evidence_id, "verified")}
                              style={miniBtnOk}>Verify</button>
                            <button onClick={() => verifyEvidence(e.evidence_id, "rejected")}
                              style={miniBtnNo}>Reject</button>
                            <span style={{
                              fontSize: 11, color: COLORS.textMuted,
                              textTransform: "uppercase", alignSelf: "center"
                            }}>{e.verification_status}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {detail?.history?.length > 0 && (
                    <>
                      <h3 style={subHeading}>Status history</h3>
                      {detail.history.map((h, i) => (
                        <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                          <strong>{h.new_status.replace(/_/g, " ")}</strong>{" "}
                          <small style={{ color: COLORS.textMuted }}>
                            {new Date(h.changed_at).toLocaleString()}
                          </small>
                          {h.change_reason && (
                            <div style={{ color: COLORS.textMid }}>{h.change_reason}</div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  <div style={{
                    padding: 12, marginTop: 16, marginBottom: 4,
                    background: "#ecfdf3", border: "1px solid #06764755",
                    borderRadius: 8
                  }}>
                    <p style={{
                      margin: "0 0 8px", fontSize: 12, color: "#067647", fontWeight: 700
                    }}>Quick actions</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button disabled={updating} onClick={() => setStatus("received")} style={quickBtn(COLORS.blue)}>
                        Mark received
                      </button>
                      <button disabled={updating} onClick={() => setStatus("under_review")} style={quickBtn("#b45309")}>
                        Under review
                      </button>
                      <button disabled={updating} onClick={() => setStatus("referred")} style={quickBtn("#7a1fa2")}>
                        Refer to officers
                      </button>
                      <button disabled={updating} onClick={() => setStatus("approved")} style={quickBtn(COLORS.green)}>
                        Approve
                      </button>
                    </div>
                  </div>

                  <h3 style={subHeading}>Update status</h3>
                  <textarea
                    placeholder="Note for the applicant (optional)"
                    value={note} onChange={e => setNote(e.target.value)}
                    rows={2} style={{ ...inputStyle, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      ["received","Received",COLORS.blue],
                      ["under_review","Under review","#b45309"],
                      ["more_information_required","Request info","#b45309"],
                      ["awaiting_payment","Awaiting payment","#b45309"],
                      ["referred","Referred","#7a1fa2"],
                      ["in_progress","In progress","#0f766e"],
                      ["approved","Approved",COLORS.green],
                      ["ready_for_collection","Ready","#067647"],
                      ["completed","Completed","#6651aa"],
                      ["rejected","Reject",COLORS.error],
                      ["cancelled","Cancel","#475569"]
                    ].map(([key, label, bg]) => (
                      <button key={key} disabled={updating}
                        onClick={() => setStatus(key)}
                        style={{
                          padding: "8px 12px", border: 0, background: bg,
                          color: "#fff", borderRadius: 6,
                          fontWeight: 700, fontSize: 12,
                          cursor: updating ? "wait" : "pointer",
                          fontFamily: "inherit"
                        }}>{label}</button>
                    ))}
                  </div>

                  <h3 style={subHeading}>Schedule appointment</h3>
                  <form onSubmit={submitAppointment}>
                    <input type="datetime-local" required
                      value={apptForm.appointment_date}
                      onChange={e => setApptForm(p => ({ ...p, appointment_date: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 6 }} />
                    <select value={apptForm.appointment_type}
                      onChange={e => setApptForm(p => ({ ...p, appointment_type: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 6 }}>
                      <option value="statement">Statement</option>
                      <option value="biometrics">Biometrics</option>
                      <option value="interview">Interview</option>
                      <option value="collection">Collection</option>
                      <option value="other">Other</option>
                    </select>
                    <input placeholder="Office location"
                      value={apptForm.office_location}
                      onChange={e => setApptForm(p => ({ ...p, office_location: e.target.value }))}
                      style={inputStyle} />
                    <button type="submit" style={{ ...btnSmall, marginTop: 8 }}>
                      Schedule
                    </button>
                    {apptMsg && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: apptMsg.startsWith("Error") ? COLORS.error : COLORS.green
                      }}>{apptMsg}</p>
                    )}
                  </form>

                  <h3 style={subHeading}>Record payment</h3>
                  <form onSubmit={submitPayment} style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    gap: 10, marginBottom: 6
                  }}>
                    <input placeholder="Fee type" value={payForm.fee_type}
                      onChange={e => setPayForm(p => ({ ...p, fee_type: e.target.value }))}
                      style={inputStyle} />
                    <input placeholder="Amount" type="number" step="0.01"
                      value={payForm.amount}
                      onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                      style={inputStyle} />
                    <select value={payForm.payment_method}
                      onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                      style={inputStyle}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="card">Card</option>
                      <option value="mobile_money">Mobile money</option>
                    </select>
                    <select value={payForm.payment_status}
                      onChange={e => setPayForm(p => ({ ...p, payment_status: e.target.value }))}
                      style={inputStyle}>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                    <input placeholder="Transaction ref"
                      value={payForm.transaction_reference}
                      onChange={e => setPayForm(p => ({ ...p, transaction_reference: e.target.value }))}
                      style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                    <button type="submit" style={{ ...btnSmall, gridColumn: "1 / -1" }}>
                      Record payment
                    </button>
                    {payMsg && (
                      <p style={{
                        gridColumn: "1 / -1", fontSize: 12,
                        color: payMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                        margin: 0
                      }}>{payMsg}</p>
                    )}
                  </form>
                </>
              )}
            </aside>
          </section>
        )}

        {/* ================= LETTERS TAB ================= */}
        {tab === "letters" && (
          <section>
            <h2 style={section.title}>Letters</h2>
            <p style={section.subtitle}>Letters issued to citizens.</p>

            {letters.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No letters issued yet.</p>
            )}

            {letters.map(l => (
              <article key={l.letter_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{l.title}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                      {l.reference_number} · {l.full_name} · {new Date(l.issued_at).toLocaleString()}
                    </p>
                  </div>
                  <span style={{
                    padding: "3px 10px", background: COLORS.blueLight, color: COLORS.blue,
                    borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase"
                  }}>{l.letter_type.replace(/_/g, " ")}</span>
                </div>
                <pre style={{
                  whiteSpace: "pre-wrap", marginTop: 10, fontFamily: "Consolas, monospace",
                  fontSize: 12, lineHeight: 1.5, padding: 12,
                  background: "#f8fafc", border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 8, maxHeight: 240, overflowY: "auto"
                }}>{l.body}</pre>
              </article>
            ))}
          </section>
        )}

        {/* ================= CERTIFIED DOCS TAB ================= */}
        {tab === "certify" && (
          <section style={grids.twoCol}>
            <article style={cards.cardPadded}>
              <h2 style={section.title}>Certified docs — queue</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 44 }}></th>
                      {["Ref","Applicant","Document","Status",""].map(h =>
                        <th key={h} style={thStyle}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {certDocs.length === 0 && (
                      <tr><td colSpan={5} style={{
                        padding: 16, color: COLORS.textMuted, fontSize: 13
                      }}>No certified-document requests.</td></tr>
                    )}
                    {certDocs.map(d => (
                      <tr key={d.certified_doc_id}>
                        <td style={{ ...tdStyle, width: 44 }}>
                          {d.photo_url ? (
                            <img src={d.photo_url} alt={d.full_name}
                              style={{ width: 34, height: 42, borderRadius: 4, objectFit: "cover" }} />
                          ) : (
                            <div style={{
                              width: 34, height: 42, borderRadius: 4,
                              background: COLORS.lightBg, border: `1px solid ${COLORS.borderLight}`
                            }} />
                          )}
                        </td>
                        <td style={tdStyle}><strong>{d.reference_number}</strong></td>
                        <td style={tdStyle}>{d.full_name || "—"}</td>
                        <td style={tdStyle}>{d.document_title}</td>
                        <td style={tdStyle}><StatusBadge status={d.status} /></td>
                        <td style={tdStyle}>
                          <button style={linkBtn}
                            onClick={() => openCertDoc(d.certified_doc_id)}>Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside style={cards.cardPadded}>
              {!certDetail && (
                <>
                  <h2 style={section.title}>Request detail</h2>
                  <p style={section.subtitle}>Select a request to review.</p>
                </>
              )}

              {certDetail && (
                <>
                  <h2 style={{ margin: 0, color: COLORS.blue, fontSize: 16 }}>
                    {certDetail.document.reference_number}
                  </h2>
                  <p style={{ margin: "4px 0 14px", fontSize: 12, color: COLORS.textMuted }}>
                    {certDetail.document.document_title}
                  </p>

                  <Row label="Applicant" value={certDetail.document.full_name} />
                  <Row label="National ID" value={certDetail.document.national_id || "—"} />
                  <Row label="Email" value={certDetail.document.email || "—"} />
                  <Row label="Phone" value={certDetail.document.phone || "—"} />
                  <Row label="Purpose" value={certDetail.document.purpose || "—"} />
                  <Row label="Status" value={<StatusBadge status={certDetail.document.status} />} />

                  <h3 style={subHeading}>Files</h3>
                  <p style={{ fontSize: 13 }}>
                    <strong>Original:</strong>{" "}
                    <a href={`${API_BASE.replace("/api", "")}${certDetail.document.original_url}`}
                       target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
                      {certDetail.document.original_filename}
                    </a>
                  </p>
                  {certDetail.document.certified_url && (
                    <p style={{ fontSize: 13 }}>
                      <strong>Certified:</strong>{" "}
                      <a href={`${API_BASE.replace("/api", "")}${certDetail.document.certified_url}`}
                         target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
                        {certDetail.document.certified_filename}
                      </a>
                    </p>
                  )}

                  <h3 style={subHeading}>Mark as certified</h3>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 0 }}>
                    The system will stamp the applicant's original document
                    with the Lesotho Police Service official stamp and produce
                    a certified PDF for them to download.
                  </p>
                  <input
                    placeholder="Certifying officer name (optional)"
                    value={certOfficer}
                    onChange={e => setCertOfficer(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 8 }}
                  />
                  <button
                    type="button"
                    onClick={markCertified}
                    disabled={certUpdating}
                    style={btnSmall}
                  >
                    {certUpdating ? "Stamping…" : "Mark as certified"}
                  </button>
                  {certMsg && (
                    <p style={{
                      fontSize: 12, marginTop: 8,
                      color: certMsg.startsWith("Error") ? COLORS.error : COLORS.green
                    }}>{certMsg}</p>
                  )}

                  <h3 style={subHeading}>Update status</h3>
                  <textarea
                    placeholder="Note for the applicant"
                    value={certNote}
                    onChange={e => setCertNote(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      ["under_review","Under review",COLORS.blue],
                      ["more_information_required","Request info","#b45309"],
                      ["awaiting_payment","Awaiting payment","#b45309"],
                      ["certified","Certified",COLORS.green],
                      ["rejected","Reject",COLORS.error],
                      ["cancelled","Cancel","#475569"]
                    ].map(([key, label, bg]) => (
                      <button key={key} disabled={certUpdating}
                        onClick={() => setCertStatus(key)}
                        style={{
                          padding: "8px 12px", border: 0, background: bg,
                          color: "#fff", borderRadius: 6, fontWeight: 700,
                          fontSize: 12, cursor: certUpdating ? "wait" : "pointer",
                          fontFamily: "inherit"
                        }}>{label}</button>
                    ))}
                  </div>

                  <h3 style={subHeading}>Record payment</h3>
                  <form onSubmit={submitCertPayment} style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10
                  }}>
                    <input placeholder="Fee type" value={certPayForm.fee_type}
                      onChange={e => setCertPayForm(p => ({ ...p, fee_type: e.target.value }))}
                      style={inputStyle} />
                    <input placeholder="Amount" type="number" step="0.01"
                      value={certPayForm.amount}
                      onChange={e => setCertPayForm(p => ({ ...p, amount: e.target.value }))}
                      style={inputStyle} />
                    <select value={certPayForm.payment_method}
                      onChange={e => setCertPayForm(p => ({ ...p, payment_method: e.target.value }))}
                      style={inputStyle}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="card">Card</option>
                      <option value="mobile_money">Mobile money</option>
                    </select>
                    <select value={certPayForm.payment_status}
                      onChange={e => setCertPayForm(p => ({ ...p, payment_status: e.target.value }))}
                      style={inputStyle}>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                    <input placeholder="Transaction ref"
                      value={certPayForm.transaction_reference}
                      onChange={e => setCertPayForm(p => ({ ...p, transaction_reference: e.target.value }))}
                      style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                    <button type="submit" style={{ ...btnSmall, gridColumn: "1 / -1" }}>
                      Record payment
                    </button>
                    {certPayMsg && (
                      <p style={{
                        gridColumn: "1 / -1", fontSize: 12,
                        color: certPayMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                        margin: 0
                      }}>{certPayMsg}</p>
                    )}
                  </form>

                  <div style={{ textAlign: "right", marginTop: 16 }}>
                    <button onClick={() => setCertDetail(null)} style={btnSmall}>Close</button>
                  </div>
                </>
              )}
            </aside>
          </section>
        )}

        {/* ================= FEEDBACK TAB ================= */}
        {tab === "feedback" && (
          <section>
            <h2 style={section.title}>Citizen feedback</h2>
            <p style={section.subtitle}>Recent ratings and comments.</p>
            {feedback.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No feedback submitted.</p>
            )}
            {feedback.map(f => (
              <article key={f.feedback_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13 }}>
                    {f.full_name} · Rating {f.rating}/5
                  </strong>
                  <small style={{ color: COLORS.textMuted, fontSize: 11 }}>
                    {new Date(f.submitted_at).toLocaleString()}
                  </small>
                </div>
                {f.comments && (
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: COLORS.textMid }}>
                    {f.comments}
                  </p>
                )}
              </article>
            ))}
          </section>
        )}

        {/* ================= AUDIT TAB ================= */}
        {tab === "audit" && (
          <section>
            <h2 style={section.title}>Audit log</h2>
            <p style={section.subtitle}>Recent police-related actions.</p>
            <div style={cards.cardPadded}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Timestamp","Actor","Action","Application"].map(h =>
                      <th key={h} style={thStyle}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {audit.map((l, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{new Date(l.created_at).toLocaleString()}</td>
                      <td style={tdStyle}>{l.actor_name || l.user_id}</td>
                      <td style={tdStyle}><strong>{l.action}</strong></td>
                      <td style={tdStyle}>{l.application_id || "—"}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={4} style={{
                      padding: 16, color: COLORS.textMuted, fontSize: 13
                    }}>No audit records.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// ============================================================
function Metric({ label, value }) {
  return (
    <article style={cards.metric}>
      <p style={cards.metricLabel}>{label}</p>
      <p style={cards.metricValue}>{value}</p>
    </article>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "5px 0", fontSize: 13,
      borderBottom: `1px solid ${COLORS.borderLight}`, gap: 12
    }}>
      <span style={{
        color: COLORS.textMuted, textTransform: "capitalize", whiteSpace: "nowrap"
      }}>{label}</span>
      <span style={{
        color: COLORS.textDark, fontWeight: 600,
        textAlign: "right", wordBreak: "break-word", minWidth: 0
      }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    submitted:                 { bg: "#eff8ff", fg: "#175cd3" },
    received:                  { bg: "#eff8ff", fg: "#175cd3" },
    under_review:              { bg: "#fff4df", fg: "#b45309" },
    more_information_required: { bg: "#fff4df", fg: "#b45309" },
    awaiting_payment:          { bg: "#fff4df", fg: "#b45309" },
    referred:                  { bg: "#f5e9fb", fg: "#7a1fa2" },
    in_progress:               { bg: "#e6f4f1", fg: "#0f766e" },
    approved:                  { bg: "#ecfdf3", fg: "#067647" },
    rejected:                  { bg: "#fdecea", fg: "#b3261e" },
    ready_for_collection:      { bg: "#ecfdf3", fg: "#067647" },
    completed:                 { bg: "#f0edfc", fg: "#6651aa" },
    cancelled:                 { bg: "#f1f5f9", fg: "#475569" },
    certified:                 { bg: "#ecfdf3", fg: "#067647" }
  };
  const s = map[status] || { bg: "#f1f5f9", fg: "#475569" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      background: s.bg, color: s.fg, borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 0.4, whiteSpace: "nowrap"
    }}>{status.replace(/_/g, " ")}</span>
  );
}

const subHeading = {
  fontSize: 12, color: COLORS.textMuted,
  textTransform: "uppercase", marginTop: 18,
  marginBottom: 6, letterSpacing: 0.6, fontWeight: 700
};

const thStyle = {
  padding: "10px 12px 10px 0", textAlign: "left",
  fontSize: 11, textTransform: "uppercase", color: COLORS.textMuted,
  fontWeight: 700, borderBottom: `1px solid ${COLORS.borderLight}`,
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "12px 12px 12px 0", fontSize: 13,
  color: COLORS.textMid, borderBottom: `1px solid ${COLORS.borderLight}`,
  verticalAlign: "middle"
};

const linkBtn = {
  border: 0, background: "transparent", color: COLORS.blue,
  fontWeight: 700, fontSize: 12, cursor: "pointer",
  padding: 0, fontFamily: "inherit"
};

const selectStyle = {
  padding: "8px 12px", border: `1px solid ${COLORS.border}`,
  borderRadius: 6, fontSize: 12, fontFamily: "inherit",
  background: "#fff", outline: "none"
};

const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: `1px solid ${COLORS.border}`, borderRadius: 6,
  fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box"
};

const btnSmall = {
  padding: "8px 14px", border: 0, background: COLORS.blue,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
};

const miniBtnOk = {
  padding: "4px 10px", border: 0, background: COLORS.green,
  color: "#fff", borderRadius: 4, cursor: "pointer",
  fontWeight: 700, fontSize: 11, fontFamily: "inherit"
};

const miniBtnNo = {
  padding: "4px 10px", border: 0, background: COLORS.error,
  color: "#fff", borderRadius: 4, cursor: "pointer",
  fontWeight: 700, fontSize: 11, fontFamily: "inherit"
};

const quickBtn = (bg) => ({
  padding: "10px 16px", border: 0, background: bg,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
});
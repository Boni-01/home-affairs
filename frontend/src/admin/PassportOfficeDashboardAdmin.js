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
  { key: "under_review", label: "Under review" },
  { key: "more_information_required", label: "Info required" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "awaiting_appointment", label: "Awaiting appointment" },
  { key: "awaiting_biometrics", label: "Awaiting biometrics" },
  { key: "approved", label: "Approved" },
  { key: "in_production", label: "In production" },
  { key: "ready_for_collection", label: "Ready for collection" },
  { key: "collected", label: "Collected" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" }
];

const TYPE_FILTERS = [
  { key: "", label: "All types" },
  { key: "first_time", label: "First time" },
  { key: "renewal", label: "Renewal" },
  { key: "replacement", label: "Replacement" }
];

const TIER_FILTERS = [
  { key: "", label: "All tiers" },
  { key: "standard", label: "Standard" },
  { key: "urgent", label: "Urgent" },
  { key: "express", label: "Express" },
  { key: "emergency", label: "Emergency" },
  { key: "official", label: "Official" },
  { key: "diplomatic", label: "Diplomatic" }
];

const TIER_COLORS = {
  standard:   "#175cd3",
  urgent:     "#b45309",
  express:    "#b3261e",
  emergency:  "#7a1fa2",
  official:   "#0f766e",
  diplomatic: "#334155"
};

function PassportOfficeDashboardAdmin() {
  const [tab, setTab] = useState("queue");

  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [audit, setAudit] = useState([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const [issueForm, setIssueForm] = useState({
    passport_number: "", issue_date: "", expiry_date: ""
  });
  const [issueMsg, setIssueMsg] = useState("");

  const [bioForm, setBioForm] = useState({
    fingerprints_captured: false, photograph_captured: false,
    signature_captured: false, enrolment_reference: "", notes: ""
  });
  const [bioMsg, setBioMsg] = useState("");

  const [apptForm, setApptForm] = useState({
    appointment_date: "", appointment_type: "biometrics",
    office_location: "Maseru Passport Office"
  });
  const [apptMsg, setApptMsg] = useState("");

  const [payForm, setPayForm] = useState({
    fee_type: "Passport fee", amount: "200",
    payment_method: "cash", payment_status: "paid",
    transaction_reference: ""
  });
  const [payMsg, setPayMsg] = useState("");

  const [complaintResponse, setComplaintResponse] = useState({});
  const [complaintMsg, setComplaintMsg] = useState({});

  const loadStats = useCallback(async () => {
    try {
      const data = await api("/passport/admin/stats");
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
      if (tierFilter) qs.set("processing_tier", tierFilter);
      const data = await api(`/passport/admin/applications?${qs}`);
      setQueue(data.applications || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter, tierFilter]);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await api("/passport/admin/complaints");
      setComplaints(data.complaints || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const data = await api("/passport/admin/audit");
      setAudit(data.logs || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => {
    if (tab === "complaints") loadComplaints();
    if (tab === "audit") loadAudit();
  }, [tab, loadComplaints, loadAudit]);

  async function openApplication(id) {
    try {
      const data = await api(`/passport/applications/${id}`);

      // Guard: only passport apps should be opened from this dashboard
      if (data.application?.module && data.application.module !== "PASSPORT") {
        alert("This application belongs to a different office.");
        return;
      }

      setSelected(data.application);
      setDetail(data);
      setNote("");
      setIssueMsg(""); setBioMsg(""); setApptMsg(""); setPayMsg("");
      setBioForm({
        fingerprints_captured: !!data.biometrics?.fingerprints_captured,
        photograph_captured: !!data.biometrics?.photograph_captured,
        signature_captured: !!data.biometrics?.signature_captured,
        enrolment_reference: data.biometrics?.enrolment_reference || "",
        notes: data.biometrics?.notes || ""
      });
      if (data.passport) {
        setIssueForm({
          passport_number: data.passport.passport_number || "",
          issue_date: data.passport.issue_date || "",
          expiry_date: data.passport.expiry_date || ""
        });
      } else {
        setIssueForm({ passport_number: "", issue_date: "", expiry_date: "" });
      }
      if (data.application?.fee_amount != null) {
        setPayForm(p => ({
          ...p,
          amount: String(Number(data.application.fee_amount).toFixed(2))
        }));
      }
    } catch (err) { alert(err.message); }
  }

  async function setStatus(newStatus) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api(`/passport/admin/applications/${selected.application_id}/status`, {
        method: "POST",
        body: JSON.stringify({ newStatus, note })
      });
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  }

  async function submitIssue(e) {
    e.preventDefault();
    setIssueMsg("");
    try {
      await api(`/passport/admin/applications/${selected.application_id}/issue`, {
        method: "POST",
        body: JSON.stringify(issueForm)
      });
      setIssueMsg("Passport issued successfully.");
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { setIssueMsg("Error: " + err.message); }
  }

  async function submitBiometrics(e) {
    e.preventDefault();
    setBioMsg("");
    try {
      await api(`/passport/admin/applications/${selected.application_id}/biometrics`, {
        method: "POST",
        body: JSON.stringify(bioForm)
      });
      setBioMsg("Biometrics updated.");
      await openApplication(selected.application_id);
    } catch (err) { setBioMsg("Error: " + err.message); }
  }

  async function submitAppointment(e) {
    e.preventDefault();
    setApptMsg("");
    try {
      await api(`/passport/admin/applications/${selected.application_id}/appointment`, {
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
      await api(`/passport/admin/applications/${selected.application_id}/payment`, {
        method: "POST",
        body: JSON.stringify(payForm)
      });
      setPayMsg("Payment recorded.");
      await openApplication(selected.application_id);
      await loadStats();
    } catch (err) { setPayMsg("Error: " + err.message); }
  }

  async function respondToComplaint(complaintId) {
    const text = complaintResponse[complaintId];
    if (!text) return;
    try {
      await api(`/passport/admin/complaints/${complaintId}/respond`, {
        method: "POST",
        body: JSON.stringify({ admin_response: text, complaint_status: "resolved" })
      });
      setComplaintMsg(prev => ({ ...prev, [complaintId]: "Response sent." }));
      await loadComplaints();
    } catch (err) {
      setComplaintMsg(prev => ({ ...prev, [complaintId]: "Error: " + err.message }));
    }
  }

  const countFor = (key) =>
    stats.byStatus?.find(s => s.status === key)?.count || 0;

  const passportPhoto =
    selected?.passport_photo_url || detail?.application?.passport_photo_url || null;
  const profilePhoto = selected?.photo_url || null;

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
              <p style={header.eyebrow}>Home Affairs · Passport Administrator</p>
              <h1 style={header.title}>Passport Admin Dashboard</h1>
              <p style={header.subtitle}>
                Review, approve, and issue passports
              </p>
            </div>
            <span style={header.liveBadge}>
              <span style={header.liveDot} />
              {countFor("submitted")} new
            </span>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        <section style={grids.metrics}>
          <Metric label="Total applications" value={stats.totalApplications || 0} />
          <Metric label="Pending" value={stats.pendingApplications || 0} />
          <Metric label="Approved" value={stats.approvedApplications || 0} />
          <Metric label="Ready for collection" value={stats.readyForCollection || 0} />
          <Metric label="Open complaints" value={stats.openComplaints || 0} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["queue", "Application queue"],
            ["complaints", "Complaints"],
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

        {tab === "queue" && (
          <section style={grids.twoCol}>
            <article style={cards.cardPadded}>
              <h2 style={section.title}>Passport queue</h2>
              <p style={section.subtitle}>
                Only passport applications appear here.
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
                  {TYPE_FILTERS.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={selectStyle}>
                  {TIER_FILTERS.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
                  {STATUS_FILTERS.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              {loading && <p style={{ color: COLORS.textMuted }}>Loading…</p>}
              {error && <p style={{ color: COLORS.error }}>{error}</p>}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 44 }}></th>
                      {["Ref", "Applicant", "Type", "Tier", "Status", ""].map(h =>
                        <th key={h} style={thStyle}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {queue.length === 0 && !loading && (
                      <tr><td colSpan={6} style={{
                        padding: 16, color: COLORS.textMuted, fontSize: 13
                      }}>No passport applications.</td></tr>
                    )}
                    {queue.map(a => (
                      <tr key={a.application_id}>
                        <td style={{ ...tdStyle, width: 44 }}>
                          {a.passport_photo_url || a.photo_url ? (
                            <img
                              src={a.passport_photo_url || a.photo_url}
                              alt={a.full_name}
                              style={{
                                width: 34, height: 42, borderRadius: 4,
                                objectFit: "cover", display: "block",
                                border: `1px solid ${COLORS.borderLight}`
                              }}
                            />
                          ) : (
                            <div style={{
                              width: 34, height: 42, borderRadius: 4,
                              background: COLORS.lightBg,
                              border: `1px solid ${COLORS.borderLight}`,
                              display: "grid", placeItems: "center",
                              fontSize: 8, color: COLORS.textMuted
                            }}>N/A</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <strong>{a.reference_number}</strong>
                        </td>
                        <td style={tdStyle}>{a.full_name || "—"}</td>
                        <td style={tdStyle}>{a.application_type.replace(/_/g, " ")}</td>
                        <td style={tdStyle}>
                          <TierBadge tier={a.processing_tier} />
                        </td>
                        <td style={tdStyle}><StatusBadge status={a.status} /></td>
                        <td style={tdStyle}>
                          <button style={linkBtn}
                            onClick={() => openApplication(a.application_id)}>
                            Open
                          </button>
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
                  <h2 style={section.title}>Application detail</h2>
                  <p style={section.subtitle}>Select a passport application to review.</p>
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
                        {selected.application_type.replace(/_/g, " ")}
                        {selected.service_name ? ` · ${selected.service_name}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <div style={{
                    display: "flex", gap: 16, padding: 14, marginBottom: 14,
                    background: COLORS.lightBg, borderRadius: 10,
                    border: `1px solid ${COLORS.borderLight}`, flexWrap: "wrap"
                  }}>
                    <div style={{ flexShrink: 0 }}>
                      <p style={miniLabel}>Passport photo</p>
                      <div style={{
                        width: 90, height: 116, borderRadius: 6, overflow: "hidden",
                        border: `1px solid ${COLORS.border}`, background: "#fff",
                        display: "grid", placeItems: "center"
                      }}>
                        {passportPhoto ? (
                          <img src={passportPhoto} alt="Passport"
                            crossOrigin="anonymous"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 10, color: COLORS.textMuted, padding: 6 }}>
                            Not uploaded
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <p style={miniLabel}>Profile photo</p>
                      <div style={{
                        width: 90, height: 116, borderRadius: 6, overflow: "hidden",
                        border: `1px solid ${COLORS.border}`, background: "#fff",
                        display: "grid", placeItems: "center"
                      }}>
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Profile"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 10, color: COLORS.textMuted, padding: 6 }}>
                            No photo
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{
                        margin: "0 0 6px", fontSize: 14,
                        fontWeight: 700, color: COLORS.textDark
                      }}>{selected.full_name}</p>
                      <Row label="National ID" value={selected.national_id || "—"} />
                      <Row label="Email" value={selected.email || "—"} />
                      <Row label="Phone" value={selected.phone || "—"} />
                      <Row label="Tier" value={<TierBadge tier={selected.processing_tier} />} />
                      {selected.fee_amount != null && (
                        <Row label="Fee" value={`M ${Number(selected.fee_amount).toFixed(2)}`} />
                      )}
                    </div>
                  </div>

                  <h3 style={subHeading}>Submitted fields</h3>
                  {detail?.values?.map(v => (
                    <Row key={v.field_key} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
                  ))}

                  {detail?.documents?.length > 0 && (
                    <>
                      <h3 style={subHeading}>Documents</h3>
                      <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                        {detail.documents.map(d => (
                          <li key={d.document_id}>
                            <a href={`${API_BASE.replace("/api", "")}${d.storage_path}`}
                               target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
                              {d.original_filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {detail?.history?.length > 0 && (
                    <>
                      <h3 style={subHeading}>Status history</h3>
                      {detail.history.map((h, i) => (
                        <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                          <strong>{h.new_status?.replace(/_/g, " ")}</strong>{" "}
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
                      margin: "0 0 8px", fontSize: 12,
                      color: "#067647", fontWeight: 700
                    }}>Quick action</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button disabled={updating}
                        onClick={() => setStatus("approved")}
                        style={quickApprove}>
                        {updating ? "Working…" : "Approve application"}
                      </button>
                      <button disabled={updating}
                        onClick={() => setStatus("in_production")}
                        style={quickProduction}>
                        Mark in production
                      </button>
                    </div>
                  </div>

                  <h3 style={subHeading}>Update status</h3>
                  <textarea
                    placeholder="Optional note for the applicant"
                    value={note} onChange={e => setNote(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      ["under_review", "Under review", COLORS.blue],
                      ["more_information_required", "Request info", "#b45309"],
                      ["awaiting_payment", "Awaiting payment", "#b45309"],
                      ["awaiting_appointment", "Awaiting appt", "#b45309"],
                      ["awaiting_biometrics", "Awaiting bio", "#b45309"],
                      ["approved", "Approve", COLORS.green],
                      ["in_production", "In production", COLORS.blue],
                      ["ready_for_collection", "Ready", COLORS.green],
                      ["collected", "Collected", "#6651aa"],
                      ["rejected", "Reject", COLORS.error]
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
                    <input placeholder="Transaction ref" value={payForm.transaction_reference}
                      onChange={e => setPayForm(p => ({ ...p, transaction_reference: e.target.value }))}
                      style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                    <button type="submit" style={{
                      ...btnSmall, gridColumn: "1 / -1"
                    }}>Record payment</button>
                    {payMsg && (
                      <p style={{
                        gridColumn: "1 / -1", fontSize: 12,
                        color: payMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                        margin: 0
                      }}>{payMsg}</p>
                    )}
                  </form>

                  <h3 style={subHeading}>Biometrics</h3>
                  <form onSubmit={submitBiometrics} style={{ marginBottom: 6 }}>
                    <label style={checkboxLabel}>
                      <input type="checkbox"
                        checked={bioForm.fingerprints_captured}
                        onChange={e => setBioForm(p => ({ ...p, fingerprints_captured: e.target.checked }))} />
                      {" "}Fingerprints captured
                    </label>
                    <label style={checkboxLabel}>
                      <input type="checkbox"
                        checked={bioForm.photograph_captured}
                        onChange={e => setBioForm(p => ({ ...p, photograph_captured: e.target.checked }))} />
                      {" "}Photograph captured
                    </label>
                    <label style={checkboxLabel}>
                      <input type="checkbox"
                        checked={bioForm.signature_captured}
                        onChange={e => setBioForm(p => ({ ...p, signature_captured: e.target.checked }))} />
                      {" "}Signature captured
                    </label>
                    <input placeholder="Enrolment reference" value={bioForm.enrolment_reference}
                      onChange={e => setBioForm(p => ({ ...p, enrolment_reference: e.target.value }))}
                      style={{ ...inputStyle, marginTop: 6 }} />
                    <button type="submit" style={{ ...btnSmall, marginTop: 8 }}>
                      Save biometrics
                    </button>
                    {bioMsg && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: bioMsg.startsWith("Error") ? COLORS.error : COLORS.green
                      }}>{bioMsg}</p>
                    )}
                  </form>

                  <h3 style={subHeading}>Schedule appointment</h3>
                  <form onSubmit={submitAppointment}>
                    <input type="datetime-local" value={apptForm.appointment_date}
                      onChange={e => setApptForm(p => ({ ...p, appointment_date: e.target.value }))}
                      required style={{ ...inputStyle, marginBottom: 6 }} />
                    <select value={apptForm.appointment_type}
                      onChange={e => setApptForm(p => ({ ...p, appointment_type: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 6 }}>
                      <option value="biometrics">Biometrics</option>
                      <option value="document_verification">Document verification</option>
                      <option value="collection">Collection</option>
                      <option value="other">Other</option>
                    </select>
                    <input placeholder="Office location" value={apptForm.office_location}
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

                  <h3 style={subHeading}>Issue passport</h3>
                  <form onSubmit={submitIssue}>
                    <input placeholder="Passport number" value={issueForm.passport_number}
                      onChange={e => setIssueForm(p => ({ ...p, passport_number: e.target.value }))}
                      required style={{ ...inputStyle, marginBottom: 6 }} />
                    <label style={{ fontSize: 11, color: COLORS.textMuted }}>Issue date</label>
                    <input type="date" value={issueForm.issue_date}
                      onChange={e => setIssueForm(p => ({ ...p, issue_date: e.target.value }))}
                      required style={{ ...inputStyle, marginBottom: 6 }} />
                    <label style={{ fontSize: 11, color: COLORS.textMuted }}>Expiry date</label>
                    <input type="date" value={issueForm.expiry_date}
                      onChange={e => setIssueForm(p => ({ ...p, expiry_date: e.target.value }))}
                      required style={inputStyle} />
                    <button type="submit" style={{ ...btnSmall, marginTop: 8 }}>
                      Issue &amp; mark ready
                    </button>
                    {issueMsg && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: issueMsg.startsWith("Error") ? COLORS.error : COLORS.green
                      }}>{issueMsg}</p>
                    )}
                  </form>
                </>
              )}
            </aside>
          </section>
        )}

        {tab === "complaints" && (
          <section>
            <h2 style={section.title}>Complaints</h2>
            <p style={section.subtitle}>Citizen complaints and enquiries.</p>

            {complaints.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No complaints.</p>
            )}

            {complaints.map(c => (
              <article key={c.complaint_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 12
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", gap: 12, marginBottom: 6
                }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{c.subject}</strong>
                    <p style={{
                      margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted
                    }}>{c.full_name} · {c.email}</p>
                  </div>
                  <StatusBadge status={c.complaint_status} />
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.textMid }}>
                  {c.description}
                </p>
                {c.admin_response ? (
                  <div style={{
                    padding: 10, background: COLORS.blueLight,
                    borderRadius: 6, fontSize: 12, color: COLORS.textMid
                  }}>
                    <strong>Your response:</strong> {c.admin_response}
                  </div>
                ) : (
                  <>
                    <textarea
                      placeholder="Your response"
                      value={complaintResponse[c.complaint_id] || ""}
                      onChange={e => setComplaintResponse(p => ({
                        ...p, [c.complaint_id]: e.target.value
                      }))}
                      rows={2}
                      style={{ ...inputStyle, marginBottom: 8 }}
                    />
                    <button
                      onClick={() => respondToComplaint(c.complaint_id)}
                      style={btnSmall}>
                      Send response
                    </button>
                    {complaintMsg[c.complaint_id] && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: complaintMsg[c.complaint_id].startsWith("Error")
                          ? COLORS.error : COLORS.green
                      }}>{complaintMsg[c.complaint_id]}</p>
                    )}
                  </>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === "audit" && (
          <section>
            <h2 style={section.title}>Audit log</h2>
            <p style={section.subtitle}>Recent passport-related actions.</p>
            <div style={cards.cardPadded}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Timestamp", "Actor", "Action", "Application"].map(h =>
                      <th key={h} style={thStyle}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {audit.map((l, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
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

function TierBadge({ tier }) {
  if (!tier) return <span style={{ color: COLORS.textMuted, fontSize: 11 }}>—</span>;
  const color = TIER_COLORS[tier] || COLORS.blue;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      background: `${color}15`, color: color,
      borderRadius: 20, fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 0.4,
      border: `1px solid ${color}44`, whiteSpace: "nowrap"
    }}>{tier}</span>
  );
}

function StatusBadge({ status }) {
  const map = {
    submitted: { bg: "#eff8ff", fg: "#175cd3" },
    under_review: { bg: "#fff4df", fg: "#b45309" },
    more_information_required: { bg: "#fff4df", fg: "#b45309" },
    awaiting_payment: { bg: "#fff4df", fg: "#b45309" },
    awaiting_appointment: { bg: "#fff4df", fg: "#b45309" },
    awaiting_biometrics: { bg: "#fff4df", fg: "#b45309" },
    approved: { bg: "#ecfdf3", fg: "#067647" },
    in_production: { bg: "#eff8ff", fg: "#175cd3" },
    ready_for_collection: { bg: "#ecfdf3", fg: "#067647" },
    collected: { bg: "#f0edfc", fg: "#6651aa" },
    rejected: { bg: "#fdecea", fg: "#b3261e" },
    cancelled: { bg: "#f1f5f9", fg: "#475569" },
    resolved: { bg: "#ecfdf3", fg: "#067647" },
    closed: { bg: "#f1f5f9", fg: "#475569" },
    awaiting_response: { bg: "#fff4df", fg: "#b45309" }
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

const miniLabel = {
  margin: "0 0 4px", fontSize: 10, color: COLORS.textMuted,
  textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700
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

const quickApprove = {
  padding: "10px 16px", border: 0, background: COLORS.green,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
};

const quickProduction = {
  padding: "10px 16px", border: 0, background: COLORS.blue,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
};

const checkboxLabel = {
  display: "block", fontSize: 13, color: COLORS.textMid, marginBottom: 4
};

export default PassportOfficeDashboardAdmin;
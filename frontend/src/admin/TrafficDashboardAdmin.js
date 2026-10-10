import React, { useEffect, useState, useCallback } from "react";
import { COLORS, layout, header, cards, grids, section } from "../styles/dashboardStyles";
import { auth, API_BASE } from "../Database/firebase";

// ============================================================
// API helper
// ============================================================
async function api(path, opts = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const isFormData = opts.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ============================================================
// FILTERS
// ============================================================
const STATUS_FILTERS = [
  { key: "", label: "All statuses" },
  { key: "DRAFT", label: "Draft" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "DOCUMENTS_REQUIRED", label: "Documents required" },
  { key: "APPOINTMENT_REQUIRED", label: "Appointment required" },
  { key: "PAYMENT_PENDING", label: "Payment pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "PROCESSING", label: "Processing" },
  { key: "READY_FOR_COLLECTION", label: "Ready for collection" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" }
];

const TYPE_FILTERS = [
  { key: "", label: "All types" },
  { key: "LEARNER_LICENCE", label: "Learner Licence" },
  { key: "DRIVER_LICENCE", label: "Driver Licence" },
  { key: "LICENCE_RENEWAL", label: "Licence Renewal" },
  { key: "LICENCE_REPLACEMENT", label: "Licence Replacement" },
  { key: "VEHICLE_REGISTRATION", label: "Vehicle Registration" },
  { key: "IMPORTED_VEHICLE_REGISTRATION", label: "Imported Vehicle" },
  { key: "ROADWORTHINESS_INSPECTION", label: "Roadworthiness" },
  { key: "FITNESS_INSPECTION", label: "Fitness Inspection" },
  { key: "PUBLIC_MOTOR_VEHICLE_PERMIT", label: "Public Permit" },
  { key: "DRIVING_SCHOOL_REGISTRATION", label: "Driving School" },
  { key: "INSTRUCTOR_REGISTRATION", label: "Instructor" }
];

// ============================================================
// COMPONENT
// ============================================================
function TrafficDashboardAdmin() {
  const [tab, setTab] = useState("queue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [fines, setFines] = useState([]);
  const [clearances, setClearances] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [schools, setSchools] = useState([]);
  const [payments, setPayments] = useState([]);
  const [audit, setAudit] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fineSearch, setFineSearch] = useState("");
  const [fineStatusFilter, setFineStatusFilter] = useState("");

  // Selected application
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Action forms
  const [issueLicenceForm, setIssueLicenceForm] = useState({
    licence_number: "",
    licence_category: "B",
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: ""
  });
  const [issueLicenceMsg, setIssueLicenceMsg] = useState("");

  const [registerVehicleForm, setRegisterVehicleForm] = useState({
    vin_or_chassis_number: "",
    make: "",
    model: "",
    manufacture_year: "",
    vehicle_type: "",
    colour: "",
    registration_number: "",
    expiry_date: ""
  });
  const [registerVehicleMsg, setRegisterVehicleMsg] = useState("");

  const [testBookingForm, setTestBookingForm] = useState({
    test_type: "PRACTICAL",
    office_name: "Maseru",
    scheduled_at: "",
    notes: ""
  });
  const [testBookingMsg, setTestBookingMsg] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "CASH_OFFICE",
    transaction_reference: "",
    payment_status: "SUCCESS"
  });
  const [paymentMsg, setPaymentMsg] = useState("");

  // Create fine
  const [showCreateFineModal, setShowCreateFineModal] = useState(false);
  const [createFineForm, setCreateFineForm] = useState({
    offender_name: "",
    national_id: "",
    vehicle_registration: "",
    offence_description: "",
    offence_date: new Date().toISOString().slice(0, 10),
    offence_location: "",
    amount: ""
  });
  const [createFineMsg, setCreateFineMsg] = useState("");

  // Complaint response
  const [complaintResponse, setComplaintResponse] = useState({});
  const [complaintMsg, setComplaintMsg] = useState({});

  // ============================================================
  // LOADERS
  // ============================================================
  const loadStats = useCallback(async () => {
    try {
      const data = await api("/traffic/admin/stats");
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
      const data = await api(`/traffic/admin/applications?${qs}`);
      setQueue(data.applications || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  const loadFines = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (fineSearch) qs.set("search", fineSearch);
      if (fineStatusFilter) qs.set("status", fineStatusFilter);
      const data = await api(`/traffic/admin/fines?${qs}`);
      setFines(data.fines || []);
    } catch (err) { console.error(err); }
  }, [fineSearch, fineStatusFilter]);

  const loadClearances = useCallback(async () => {
    try {
      const data = await api("/traffic/admin/clearances");
      setClearances(data.clearances || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await api("/traffic/admin/complaints");
      setComplaints(data.complaints || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadSchools = useCallback(async () => {
    try {
      const data = await api("/traffic/admin/driving-schools");
      setSchools(data.schools || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const data = await api("/traffic/admin/payments");
      setPayments(data.payments || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const data = await api("/traffic/admin/audit");
      setAudit(data.logs || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => {
    if (tab === "fines") loadFines();
    if (tab === "clearances") loadClearances();
    if (tab === "complaints") loadComplaints();
    if (tab === "schools") loadSchools();
    if (tab === "payments") loadPayments();
    if (tab === "audit") loadAudit();
  }, [tab, loadFines, loadClearances, loadComplaints, loadSchools, loadPayments, loadAudit]);

  // ============================================================
  // APPLICATION ACTIONS
  // ============================================================
  async function openApplication(id) {
    try {
      const data = await api(`/traffic/admin/applications/${id}`);
      setSelected(data.application);
      setDetail(data);
      setNote("");
      setIssueLicenceMsg("");
      setRegisterVehicleMsg("");
      setTestBookingMsg("");
      setPaymentMsg("");

      // Pre-fill forms from application data
      const values = {};
      for (const v of data.values || []) {
        values[v.field_key] = v.field_value;
      }

      setRegisterVehicleForm({
        vin_or_chassis_number: values.vin || "",
        make: values.make || "",
        model: values.model || "",
        manufacture_year: values.year || "",
        vehicle_type: values.vehicle_type || "",
        colour: values.colour || "",
        registration_number: "",
        expiry_date: ""
      });

      setPaymentForm({
        amount: data.application.fee_amount || "",
        payment_method: "CASH_OFFICE",
        transaction_reference: "",
        payment_status: "SUCCESS"
      });
    } catch (err) { alert(err.message); }
  }

  async function setStatus(newStatus) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api(`/traffic/admin/applications/${selected.application_id}/status`, {
        method: "POST",
        body: JSON.stringify({ newStatus, note })
      });
      setSuccess(`Application updated to ${newStatus.replace(/_/g, " ")}`);
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  }

  async function submitIssueLicence(e) {
    e.preventDefault();
    setIssueLicenceMsg("");
    try {
      await api(`/traffic/admin/applications/${selected.application_id}/issue-licence`, {
        method: "POST",
        body: JSON.stringify(issueLicenceForm)
      });
      setIssueLicenceMsg("Licence issued successfully.");
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { setIssueLicenceMsg("Error: " + err.message); }
  }

  async function submitRegisterVehicle(e) {
    e.preventDefault();
    setRegisterVehicleMsg("");
    try {
      const res = await api(`/traffic/admin/applications/${selected.application_id}/register-vehicle`, {
        method: "POST",
        body: JSON.stringify(registerVehicleForm)
      });
      setRegisterVehicleMsg(`Vehicle registered. Registration: ${res.registrationNumber}`);
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { setRegisterVehicleMsg("Error: " + err.message); }
  }

  async function submitTestBooking(e) {
    e.preventDefault();
    setTestBookingMsg("");
    try {
      await api(`/traffic/admin/applications/${selected.application_id}/test-booking`, {
        method: "POST",
        body: JSON.stringify(testBookingForm)
      });
      setTestBookingMsg("Test scheduled successfully.");
      await openApplication(selected.application_id);
      await loadQueue();
    } catch (err) { setTestBookingMsg("Error: " + err.message); }
  }

  async function submitPayment(e) {
    e.preventDefault();
    setPaymentMsg("");
    try {
      await api(`/traffic/admin/applications/${selected.application_id}/payment`, {
        method: "POST",
        body: JSON.stringify(paymentForm)
      });
      setPaymentMsg("Payment recorded.");
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { setPaymentMsg("Error: " + err.message); }
  }

  // ============================================================
  // FINE ACTIONS
  // ============================================================
  async function createFine(e) {
    e.preventDefault();
    setCreateFineMsg("");
    try {
      const res = await api("/traffic/admin/fines", {
        method: "POST",
        body: JSON.stringify(createFineForm)
      });
      setCreateFineMsg(`Fine created: ${res.reference}`);
      setShowCreateFineModal(false);
      setCreateFineForm({
        offender_name: "",
        national_id: "",
        vehicle_registration: "",
        offence_description: "",
        offence_date: new Date().toISOString().slice(0, 10),
        offence_location: "",
        amount: ""
      });
      await loadFines();
      await loadStats();
    } catch (err) { setCreateFineMsg("Error: " + err.message); }
  }

  async function markFinePaid(fineId) {
    if (!window.confirm("Mark this fine as paid?")) return;
    try {
      await api(`/traffic/admin/fines/${fineId}/payment`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setSuccess("Fine marked as paid.");
      await loadFines();
      await loadStats();
    } catch (err) { setError(err.message); }
  }

  // ============================================================
  // CLEARANCE ACTIONS
  // ============================================================
  async function clearClearance(clearanceId) {
    try {
      await api(`/traffic/admin/clearances/${clearanceId}/update`, {
        method: "POST",
        body: JSON.stringify({ clearance_status: "CLEARED", notes: "Cleared by admin" })
      });
      setSuccess("Clearance updated.");
      await loadClearances();
    } catch (err) { setError(err.message); }
  }

  // ============================================================
  // COMPLAINT ACTIONS
  // ============================================================
  async function respondToComplaint(complaintId) {
    const text = complaintResponse[complaintId];
    if (!text) return;
    try {
      await api(`/traffic/admin/complaints/${complaintId}/respond`, {
        method: "POST",
        body: JSON.stringify({ admin_response: text, complaint_status: "RESOLVED" })
      });
      setComplaintMsg(prev => ({ ...prev, [complaintId]: "Response sent." }));
      await loadComplaints();
    } catch (err) {
      setComplaintMsg(prev => ({ ...prev, [complaintId]: "Error: " + err.message }));
    }
  }

  // ============================================================
  // SCHOOL ACTIONS
  // ============================================================
  async function updateSchoolStatus(schoolId, status) {
    try {
      await api(`/traffic/admin/driving-schools/${schoolId}/status`, {
        method: "POST",
        body: JSON.stringify({ school_status: status })
      });
      setSuccess("School status updated.");
      await loadSchools();
    } catch (err) { setError(err.message); }
  }

  // ============================================================
  // HELPERS
  // ============================================================
  const countFor = (key) =>
    stats.byStatus?.find(s => s.status === key)?.count || 0;

  const canIssueLicence = selected &&
    selected.status === "APPROVED" &&
    (selected.application_type?.includes("LICENCE") || selected.application_type === "DRIVER_LICENCE");

  const canRegisterVehicle = selected &&
    selected.status === "APPROVED" &&
    (selected.application_type?.includes("VEHICLE") || selected.application_type === "VEHICLE_REGISTRATION");

  const canScheduleTest = selected &&
    ["LEARNER_LICENCE", "DRIVER_LICENCE"].includes(selected.application_type);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <main style={layout.page}>
      <div style={layout.container}>
        {/* HEADER */}
        <header style={header.wrapper}>
          <div style={{
            ...header.content,
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 16, flexWrap: "wrap"
          }}>
            <div>
              <p style={header.eyebrow}>Traffic Department · Administrator</p>
              <h1 style={header.title}>Traffic Admin Dashboard</h1>
              <p style={header.subtitle}>
                Manage applications, licences, vehicles, inspections, permits and fines.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setShowCreateFineModal(true)} style={btnSmall}>
                + Issue Fine
              </button>
              <span style={header.liveBadge}>
                <span style={header.liveDot} />
                {countFor("SUBMITTED")} new
              </span>
            </div>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        {error && (
          <div style={{
            padding: "14px 18px", borderRadius: 8, marginBottom: 16,
            fontSize: 13, fontWeight: 600, background: "#fdecea",
            color: "#b3261e", border: "1px solid #fecdca"
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            padding: "14px 18px", borderRadius: 8, marginBottom: 16,
            fontSize: 13, fontWeight: 600, background: "#ecfdf3",
            color: "#067647", border: "1px solid #a6f4c5"
          }}>{success}</div>
        )}

        {/* METRICS */}
        <section style={grids.metrics}>
          <Metric label="Total Applications" value={stats.totalApplications || 0} />
          <Metric label="Pending" value={stats.pendingApplications || 0} />
          <Metric label="Approved" value={stats.approvedApplications || 0} />
          <Metric label="Rejected" value={stats.rejectedApplications || 0} />
          <Metric label="Unpaid Fines" value={stats.unpaidFines || 0} />
          <Metric label="Fines Due" value={`M ${Number(stats.unpaidFinesAmount || 0).toLocaleString()}`} />
          <Metric label="Pending Clearances" value={stats.pendingClearances || 0} />
          <Metric label="Open Complaints" value={stats.openComplaints || 0} />
        </section>

        {/* TABS */}
        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["queue", "Application Queue"],
            ["fines", `Fines (${fines.length})`],
            ["clearances", `Clearances (${clearances.length})`],
            ["complaints", `Complaints (${complaints.length})`],
            ["schools", `Driving Schools (${schools.length})`],
            ["payments", `Payments (${payments.length})`],
            ["audit", "Audit Log"]
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

        {/* QUEUE TAB */}
        {tab === "queue" && (
          <section style={grids.twoCol}>
            <article style={cards.cardPadded}>
              <h2 style={section.title}>Application Queue</h2>
              <p style={section.subtitle}>Review, process and decide on applications.</p>

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
                  {TYPE_FILTERS.map(t => (
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

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Ref", "Applicant", "Type", "Urgency", "Status", ""].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queue.length === 0 && !loading && (
                      <tr><td colSpan={6} style={{ padding: 16, color: COLORS.textMuted, fontSize: 13 }}>
                        No applications.
                      </td></tr>
                    )}
                    {queue.map(a => (
                      <tr key={a.application_id}>
                        <td style={tdStyle}><strong>{a.reference_number}</strong></td>
                        <td style={tdStyle}>
                          {a.full_name}<br />
                          <small style={{ color: COLORS.textMuted }}>{a.email}</small>
                        </td>
                        <td style={tdStyle}>{a.application_type?.replace(/_/g, " ")}</td>
                        <td style={tdStyle}>
                          <span style={{
                            color: a.urgency === "URGENT" ? COLORS.red : a.urgency === "HIGH" ? COLORS.amber : COLORS.textMuted,
                            fontWeight: a.urgency !== "NORMAL" ? 700 : 400
                          }}>{a.urgency}</span>
                        </td>
                        <td style={tdStyle}><StatusBadge status={a.status} /></td>
                        <td style={tdStyle}>
                          <button style={linkBtn} onClick={() => openApplication(a.application_id)}>
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* APPLICATION DETAIL PANEL */}
            <aside style={cards.cardPadded}>
              {!selected && (
                <>
                  <h2 style={section.title}>Application Detail</h2>
                  <p style={section.subtitle}>Select an application to review.</p>
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
                        {selected.application_type?.replace(/_/g, " ")}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  {/* Applicant info */}
                  <div style={{
                    display: "flex", gap: 16, padding: 14, marginBottom: 14,
                    background: COLORS.lightBg, borderRadius: 10,
                    border: `1px solid ${COLORS.borderLight}`
                  }}>
                    <div style={{
                      width: 80, height: 100, borderRadius: 6, overflow: "hidden",
                      border: `1px solid ${COLORS.border}`, background: "#fff",
                      flexShrink: 0, display: "grid", placeItems: "center"
                    }}>
                      {selected.photo_url ? (
                        <img src={selected.photo_url} alt={selected.full_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 10, color: COLORS.textMuted, padding: 6 }}>
                          No photo
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: COLORS.textDark }}>
                        {selected.full_name}
                      </p>
                      <Row label="National ID" value={selected.national_id || "—"} />
                      <Row label="Email" value={selected.email || "—"} />
                      <Row label="Phone" value={selected.phone || "—"} />
                    </div>
                  </div>

                  {/* Submitted fields */}
                  <h3 style={subHeading}>Submitted Fields</h3>
                  {detail?.values?.map(v => (
                    <Row key={v.field_key} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
                  ))}

                  {/* Documents */}
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

                  {/* Status history */}
                  {detail?.history?.length > 0 && (
                    <>
                      <h3 style={subHeading}>Status History</h3>
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

                  {/* Update status */}
                  <h3 style={subHeading}>Update Status</h3>
                  <textarea
                    placeholder="Optional note for the applicant"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      ["UNDER_REVIEW", "Under Review", COLORS.blue],
                      ["DOCUMENTS_REQUIRED", "Request Docs", "#b45309"],
                      ["APPOINTMENT_REQUIRED", "Appointment", "#b45309"],
                      ["PAYMENT_PENDING", "Payment Pending", "#b45309"],
                      ["APPROVED", "Approve", COLORS.green],
                      ["REJECTED", "Reject", COLORS.error],
                      ["PROCESSING", "Processing", "#0f766e"],
                      ["READY_FOR_COLLECTION", "Ready", COLORS.green],
                      ["COMPLETED", "Complete", "#6651aa"]
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

                  {/* ISSUE LICENCE */}
                  {canIssueLicence && (
                    <>
                      <h3 style={subHeading}>Issue Driver's Licence</h3>
                      <form onSubmit={submitIssueLicence}>
                        <input
                          placeholder="Licence number (e.g. DL-2025-000123)"
                          value={issueLicenceForm.licence_number}
                          onChange={e => setIssueLicenceForm(p => ({ ...p, licence_number: e.target.value }))}
                          required
                          style={{ ...inputStyle, marginBottom: 8 }}
                        />
                        <select
                          value={issueLicenceForm.licence_category}
                          onChange={e => setIssueLicenceForm(p => ({ ...p, licence_category: e.target.value }))}
                          style={{ ...inputStyle, marginBottom: 8 }}
                        >
                          <option value="A">A — Motorcycle</option>
                          <option value="B">B — Light Motor Vehicle</option>
                          <option value="C">C — Heavy Motor Vehicle</option>
                          <option value="D">D — Public Service Vehicle</option>
                          <option value="EB">EB — Learner (Light)</option>
                          <option value="EC">EC — Learner (Heavy)</option>
                        </select>
                        <label style={{ fontSize: 11, color: COLORS.textMuted }}>Expiry Date</label>
                        <input
                          type="date"
                          value={issueLicenceForm.expiry_date}
                          onChange={e => setIssueLicenceForm(p => ({ ...p, expiry_date: e.target.value }))}
                          required
                          style={{ ...inputStyle, marginBottom: 8 }}
                        />
                        <button type="submit" style={btnSmall}>Issue Licence</button>
                        {issueLicenceMsg && (
                          <p style={{
                            fontSize: 12, marginTop: 6,
                            color: issueLicenceMsg.startsWith("Error") ? COLORS.error : COLORS.green
                          }}>{issueLicenceMsg}</p>
                        )}
                      </form>
                    </>
                  )}

                  {/* REGISTER VEHICLE */}
                  {canRegisterVehicle && (
                    <>
                      <h3 style={subHeading}>Register Vehicle</h3>
                      <form onSubmit={submitRegisterVehicle}>
                        <input
                          placeholder="VIN / Chassis Number"
                          value={registerVehicleForm.vin_or_chassis_number}
                          onChange={e => setRegisterVehicleForm(p => ({ ...p, vin_or_chassis_number: e.target.value }))}
                          required
                          style={{ ...inputStyle, marginBottom: 8 }}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                          <input
                            placeholder="Make"
                            value={registerVehicleForm.make}
                            onChange={e => setRegisterVehicleForm(p => ({ ...p, make: e.target.value }))}
                            required
                            style={inputStyle}
                          />
                          <input
                            placeholder="Model"
                            value={registerVehicleForm.model}
                            onChange={e => setRegisterVehicleForm(p => ({ ...p, model: e.target.value }))}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                          <input
                            type="number"
                            placeholder="Year"
                            value={registerVehicleForm.manufacture_year}
                            onChange={e => setRegisterVehicleForm(p => ({ ...p, manufacture_year: e.target.value }))}
                            style={inputStyle}
                          />
                          <input
                            placeholder="Vehicle Type"
                            value={registerVehicleForm.vehicle_type}
                            onChange={e => setRegisterVehicleForm(p => ({ ...p, vehicle_type: e.target.value }))}
                            required
                            style={inputStyle}
                          />
                        </div>
                        <input
                          placeholder="Registration Number (auto if blank)"
                          value={registerVehicleForm.registration_number}
                          onChange={e => setRegisterVehicleForm(p => ({ ...p, registration_number: e.target.value }))}
                          style={{ ...inputStyle, marginBottom: 8 }}
                        />
                        <label style={{ fontSize: 11, color: COLORS.textMuted }}>Expiry Date</label>
                        <input
                          type="date"
                          value={registerVehicleForm.expiry_date}
                          onChange={e => setRegisterVehicleForm(p => ({ ...p, expiry_date: e.target.value }))}
                          style={{ ...inputStyle, marginBottom: 8 }}
                        />
                        <button type="submit" style={btnSmall}>Register Vehicle</button>
                        {registerVehicleMsg && (
                          <p style={{
                            fontSize: 12, marginTop: 6,
                            color: registerVehicleMsg.startsWith("Error") ? COLORS.error : COLORS.green
                          }}>{registerVehicleMsg}</p>
                        )}
                      </form>
                    </>
                  )}

                  {/* SCHEDULE TEST */}
                  {canScheduleTest && (
                    <>
                      <h3 style={subHeading}>Schedule Driving Test</h3>
                      <form onSubmit={submitTestBooking}>
                        <select
                          value={testBookingForm.test_type}
                          onChange={e => setTestBookingForm(p => ({ ...p, test_type: e.target.value }))}
                          style={{ ...inputStyle, marginBottom: 8 }}
                        >
                          <option value="THEORY">Theory Test</option>
                          <option value="PRACTICAL">Practical Test</option>
                          <option value="RETEST">Re-Test</option>
                        </select>
                        <select
                          value={testBookingForm.office_name}
                          onChange={e => setTestBookingForm(p => ({ ...p, office_name: e.target.value }))}
                          style={{ ...inputStyle, marginBottom: 8 }}
                        >
                          <option value="Maseru">Maseru</option>
                          <option value="Leribe">Leribe</option>
                          <option value="Berea">Berea</option>
                          <option value="Mafeteng">Mafeteng</option>
                          <option value="Mohale's Hoek">Mohale's Hoek</option>
                          <option value="Quthing">Quthing</option>
                        </select>
                        <input
                          type="datetime-local"
                          value={testBookingForm.scheduled_at}
                          onChange={e => setTestBookingForm(p => ({ ...p, scheduled_at: e.target.value }))}
                          required
                          style={{ ...inputStyle, marginBottom: 8 }}
                        />
                        <button type="submit" style={btnSmall}>Schedule Test</button>
                        {testBookingMsg && (
                          <p style={{
                            fontSize: 12, marginTop: 6,
                            color: testBookingMsg.startsWith("Error") ? COLORS.error : COLORS.green
                          }}>{testBookingMsg}</p>
                        )}
                      </form>
                    </>
                  )}

                  {/* RECORD PAYMENT */}
                  <h3 style={subHeading}>Record Payment</h3>
                  <form onSubmit={submitPayment}>
                    <input
                      type="number"
                      placeholder="Amount (LSL)"
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                      required
                      style={{ ...inputStyle, marginBottom: 8 }}
                    />
                    <select
                      value={paymentForm.payment_method}
                      onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 8 }}
                    >
                      <option value="CASH_OFFICE">Cash (Office)</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                    </select>
                    <input
                      placeholder="Transaction reference (optional)"
                      value={paymentForm.transaction_reference}
                      onChange={e => setPaymentForm(p => ({ ...p, transaction_reference: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 8 }}
                    />
                    <button type="submit" style={btnSmall}>Record Payment</button>
                    {paymentMsg && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: paymentMsg.startsWith("Error") ? COLORS.error : COLORS.green
                      }}>{paymentMsg}</p>
                    )}
                  </form>
                </>
              )}
            </aside>
          </section>
        )}

        {/* FINES TAB */}
        {tab === "fines" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={section.title}>Traffic Fines</h2>
                <p style={section.subtitle}>All issued fines and their payment status.</p>
              </div>
              <button onClick={() => setShowCreateFineModal(true)} style={btnSmall}>+ Issue Fine</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <select value={fineStatusFilter} onChange={e => setFineStatusFilter(e.target.value)} style={selectStyle}>
                <option value="">All statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="DISPUTED">Disputed</option>
              </select>
              <input
                placeholder="Search fines…"
                value={fineSearch}
                onChange={e => setFineSearch(e.target.value)}
                style={{ ...inputStyle, width: 220 }}
              />
              <button onClick={loadFines} style={btnSmall}>Search</button>
            </div>

            {fines.length === 0 ? (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No fines found.</p>
            ) : (
              <div style={cards.cardPadded}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Reference", "Offender", "Vehicle", "Offence", "Date", "Amount", "Status", "Action"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map(f => (
                      <tr key={f.fine_id}>
                        <td style={tdStyle}><strong>{f.fine_reference}</strong></td>
                        <td style={tdStyle}>{f.offender_name || "—"}</td>
                        <td style={tdStyle}>{f.vehicle_registration || "—"}</td>
                        <td style={tdStyle}>{f.offence_description}</td>
                        <td style={tdStyle}>{f.offence_date ? new Date(f.offence_date).toLocaleDateString() : "—"}</td>
                        <td style={tdStyle}>M {Number(f.amount).toLocaleString()}</td>
                        <td style={tdStyle}><StatusBadge status={f.fine_status} /></td>
                        <td style={tdStyle}>
                          {f.fine_status === "UNPAID" && (
                            <button onClick={() => markFinePaid(f.fine_id)} style={btnSmall}>Mark Paid</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* CLEARANCES TAB */}
        {tab === "clearances" && (
          <section>
            <h2 style={section.title}>Licence Clearance Requests</h2>
            <p style={section.subtitle}>Review and approve clearance requests.</p>

            {clearances.length === 0 ? (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No clearance requests.</p>
            ) : (
              <div style={cards.cardPadded}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Reference", "Applicant", "Type", "Licence/Vehicle", "Outstanding", "Status", "Action"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clearances.map(c => (
                      <tr key={c.clearance_id}>
                        <td style={tdStyle}><strong>{c.reference_number}</strong></td>
                        <td style={tdStyle}>{c.full_name}</td>
                        <td style={tdStyle}>{c.clearance_type?.replace(/_/g, " ")}</td>
                        <td style={tdStyle}>{c.licence_number || c.vehicle_registration || "—"}</td>
                        <td style={tdStyle}>M {Number(c.outstanding_amount || 0).toLocaleString()}</td>
                        <td style={tdStyle}><StatusBadge status={c.clearance_status} /></td>
                        <td style={tdStyle}>
                          {c.clearance_status !== "CLEARED" && (
                            <button onClick={() => clearClearance(c.clearance_id)} style={btnSmall}>Clear</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* COMPLAINTS TAB */}
        {tab === "complaints" && (
          <section>
            <h2 style={section.title}>Citizen Complaints</h2>
            <p style={section.subtitle}>Complaints and enquiries submitted by citizens.</p>

            {complaints.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No complaints.</p>
            )}

            {complaints.map(c => (
              <article key={c.complaint_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 12
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{c.subject}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                      {c.full_name} · {c.email} · {c.reference_number}
                    </p>
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
                    <button onClick={() => respondToComplaint(c.complaint_id)} style={btnSmall}>
                      Send Response
                    </button>
                    {complaintMsg[c.complaint_id] && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: complaintMsg[c.complaint_id].startsWith("Error") ? COLORS.error : COLORS.green
                      }}>{complaintMsg[c.complaint_id]}</p>
                    )}
                  </>
                )}
              </article>
            ))}
          </section>
        )}

        {/* SCHOOLS TAB */}
        {tab === "schools" && (
          <section>
            <h2 style={section.title}>Driving Schools</h2>
            <p style={section.subtitle}>Registered driving schools and their authorisation status.</p>

            {schools.length === 0 ? (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No driving schools registered.</p>
            ) : (
              <div style={cards.cardPadded}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["School Name", "Reg. Number", "District", "Contact", "Status", "Actions"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map(s => (
                      <tr key={s.school_id}>
                        <td style={tdStyle}><strong>{s.school_name}</strong></td>
                        <td style={tdStyle}>{s.registration_number || "—"}</td>
                        <td style={tdStyle}>{s.district || "—"}</td>
                        <td style={tdStyle}>{s.contact_phone || s.contact_email || "—"}</td>
                        <td style={tdStyle}><StatusBadge status={s.school_status} /></td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {s.school_status === "PENDING" && (
                              <button onClick={() => updateSchoolStatus(s.school_id, "REGISTERED")} style={btnSuccess}>
                                Approve
                              </button>
                            )}
                            {s.school_status === "REGISTERED" && (
                              <button onClick={() => updateSchoolStatus(s.school_id, "SUSPENDED")} style={btnDanger}>
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <section>
            <h2 style={section.title}>Traffic Payments</h2>
            <p style={section.subtitle}>All payments for traffic services and fines.</p>

            {payments.length === 0 ? (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No payments recorded.</p>
            ) : (
              <div style={cards.cardPadded}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Reference", "Payer", "Purpose", "Amount", "Method", "Status", "Date"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.payment_id}>
                        <td style={tdStyle}><strong>{p.payment_reference}</strong></td>
                        <td style={tdStyle}>{p.payer_name || "—"}</td>
                        <td style={tdStyle}>{p.payment_purpose}</td>
                        <td style={tdStyle}>M {Number(p.amount).toLocaleString()}</td>
                        <td style={tdStyle}>{p.payment_method?.replace(/_/g, " ")}</td>
                        <td style={tdStyle}><StatusBadge status={p.payment_status} /></td>
                        <td style={tdStyle}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* AUDIT TAB */}
        {tab === "audit" && (
          <section>
            <h2 style={section.title}>Audit Log</h2>
            <p style={section.subtitle}>Recent administrative actions on traffic records.</p>

            <div style={cards.cardPadded}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Timestamp", "Actor", "Action", "Entity", "Details"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.map((l, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{new Date(l.created_at).toLocaleString()}</td>
                      <td style={tdStyle}>{l.actor_name || l.user_id}</td>
                      <td style={tdStyle}><strong>{l.action}</strong></td>
                      <td style={tdStyle}>{l.entity_type}</td>
                      <td style={tdStyle}>
                        {l.details ? JSON.stringify(l.details).slice(0, 60) : "—"}
                      </td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 16, color: COLORS.textMuted, fontSize: 13 }}>
                      No audit records.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* CREATE FINE MODAL */}
      {showCreateFineModal && (
        <Overlay onClose={() => setShowCreateFineModal(false)}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>Issue Traffic Fine</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.textMuted }}>
            Create a new traffic fine record.
          </p>

          <form onSubmit={createFine}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Offender Name</label>
              <input
                value={createFineForm.offender_name}
                onChange={e => setCreateFineForm(p => ({ ...p, offender_name: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>National ID</label>
                <input
                  value={createFineForm.national_id}
                  onChange={e => setCreateFineForm(p => ({ ...p, national_id: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Vehicle Registration</label>
                <input
                  value={createFineForm.vehicle_registration}
                  onChange={e => setCreateFineForm(p => ({ ...p, vehicle_registration: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Offence Description *</label>
              <input
                value={createFineForm.offence_description}
                onChange={e => setCreateFineForm(p => ({ ...p, offence_description: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Offence Date *</label>
                <input
                  type="date"
                  value={createFineForm.offence_date}
                  onChange={e => setCreateFineForm(p => ({ ...p, offence_date: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Amount (LSL) *</label>
                <input
                  type="number"
                  value={createFineForm.amount}
                  onChange={e => setCreateFineForm(p => ({ ...p, amount: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Offence Location</label>
              <input
                value={createFineForm.offence_location}
                onChange={e => setCreateFineForm(p => ({ ...p, offence_location: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {createFineMsg && (
              <p style={{
                fontSize: 13, marginBottom: 12,
                color: createFineMsg.startsWith("Error") ? COLORS.error : COLORS.green
              }}>{createFineMsg}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setShowCreateFineModal(false)} style={btnOutline}>
                Cancel
              </button>
              <button type="submit" style={btnSmall}>Issue Fine</button>
            </div>
          </form>
        </Overlay>
      )}
    </main>
  );
}

// ============================================================
// SUB-COMPONENTS
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
    DRAFT: { bg: "#f1f5f9", fg: "#475569" },
    SUBMITTED: { bg: "#eff8ff", fg: "#175cd3" },
    UNDER_REVIEW: { bg: "#fff4df", fg: "#b45309" },
    DOCUMENTS_REQUIRED: { bg: "#fff4df", fg: "#b45309" },
    APPOINTMENT_REQUIRED: { bg: "#fff4df", fg: "#b45309" },
    PAYMENT_PENDING: { bg: "#fff4df", fg: "#b45309" },
    APPROVED: { bg: "#ecfdf3", fg: "#067647" },
    REJECTED: { bg: "#fdecea", fg: "#b3261e" },
    PROCESSING: { bg: "#e6f4f1", fg: "#0f766e" },
    READY_FOR_COLLECTION: { bg: "#ecfdf3", fg: "#067647" },
    COMPLETED: { bg: "#f0edfc", fg: "#6651aa" },
    CANCELLED: { bg: "#f1f5f9", fg: "#475569" },
    PAID: { bg: "#ecfdf3", fg: "#067647" },
    UNPAID: { bg: "#fdecea", fg: "#b3261e" },
    VALID: { bg: "#ecfdf3", fg: "#067647" },
    EXPIRED: { bg: "#fdecea", fg: "#b3261e" },
    ACTIVE: { bg: "#ecfdf3", fg: "#067647" },
    PENDING: { bg: "#fff4df", fg: "#b45309" },
    CLEARED: { bg: "#ecfdf3", fg: "#067647" },
    OPEN: { bg: "#fff4df", fg: "#b45309" },
    IN_REVIEW: { bg: "#fff4df", fg: "#b45309" },
    RESOLVED: { bg: "#ecfdf3", fg: "#067647" },
    REGISTERED: { bg: "#ecfdf3", fg: "#067647" },
    SUSPENDED: { bg: "#fdecea", fg: "#b3261e" },
    PASS: { bg: "#ecfdf3", fg: "#067647" },
    FAIL: { bg: "#fdecea", fg: "#b3261e" },
    PASSED: { bg: "#ecfdf3", fg: "#067647" },
    FAILED: { bg: "#fdecea", fg: "#b3261e" }
  };
  const s = map[status?.toUpperCase()] || { bg: "#f1f5f9", fg: "#475569" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      background: s.bg, color: s.fg, borderRadius: 20,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 0.4, whiteSpace: "nowrap"
    }}>{status?.replace(/_/g, " ")}</span>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 28,
        maxWidth: 600, width: "100%", maxHeight: "90vh",
        overflowY: "auto", fontFamily: "Arial, sans-serif",
        boxShadow: "0 20px 60px rgba(0,32,159,0.25)"
      }}>{children}</div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
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

const labelStyle = {
  display: "block", fontSize: 13, fontWeight: 600,
  marginBottom: 6, color: COLORS.textMid
};

const btnSmall = {
  padding: "8px 14px", border: 0, background: COLORS.blue,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
};

const btnOutline = {
  padding: "8px 14px", border: `1px solid ${COLORS.border}`,
  background: "#fff", color: COLORS.textMid, borderRadius: 6,
  cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit"
};

const btnSuccess = {
  padding: "6px 12px", border: 0, background: COLORS.green,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 11, fontFamily: "inherit"
};

const btnDanger = {
  padding: "6px 12px", border: 0, background: COLORS.red,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 11, fontFamily: "inherit"
};

export default TrafficDashboardAdmin;
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

const REQUEST_STATUS_FILTERS = [
  { key: "", label: "All statuses" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "MORE_INFORMATION_REQUIRED", label: "Info required" },
  { key: "VERIFICATION_PENDING", label: "Verification pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAYMENT_PENDING", label: "Payment pending" },
  { key: "PAID", label: "Paid" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CLOSED", label: "Closed" },
  { key: "CANCELLED", label: "Cancelled" }
];

const REQUEST_TYPE_FILTERS = [
  { key: "", label: "All types" },
  { key: "REGISTRATION", label: "Registration" },
  { key: "RETIREMENT_BENEFIT", label: "Retirement benefit" },
  { key: "RESIGNATION_BENEFIT", label: "Resignation benefit" },
  { key: "TERMINATION_BENEFIT", label: "Termination benefit" },
  { key: "RETRENCHMENT_BENEFIT", label: "Retrenchment benefit" },
  { key: "DISABILITY_BENEFIT", label: "Disability benefit" },
  { key: "DEATH_BENEFIT", label: "Death benefit" },
  { key: "OLD_AGE_PENSION", label: "Old Age Pension" },
  { key: "RECORD_CORRECTION", label: "Record correction" },
  { key: "OTHER", label: "Other" }
];

const MEMBER_STATUS_FILTERS = [
  { key: "", label: "All members" },
  { key: "PENDING_VERIFICATION", label: "Pending verification" },
  { key: "ACTIVE", label: "Active" },
  { key: "RETIRED", label: "Retired" },
  { key: "RESIGNED", label: "Resigned" },
  { key: "TERMINATED", label: "Terminated" },
  { key: "DECEASED", label: "Deceased" },
  { key: "SUSPENDED", label: "Suspended" }
];

export default function PensionsDashboardAdmin() {
  const [tab, setTab] = useState("applications");

  const [stats, setStats] = useState({});
  const [applications, setApplications] = useState([]);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [audit, setAudit] = useState([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Benefit assessment form
  const [assessmentForm, setAssessmentForm] = useState({
    gross_amount: "",
    calculation_notes: "",
    approval_status: "PENDING_AUTHORITY"
  });
  const [assessmentMsg, setAssessmentMsg] = useState("");

  // Manual contribution recording
  const [contribForm, setContribForm] = useState({
    member_id: "",
    contribution_period: "",
    member_contribution: "",
    employer_contribution: ""
  });
  const [contribMsg, setContribMsg] = useState("");

  // Manual payment recording
  const [payForm, setPayForm] = useState({
    member_id: "",
    programme_code: "PODCPF",
    payment_period: "",
    amount: "",
    payment_method: "BANK",
    status: "PAID",
    provider_reference: ""
  });
  const [payMsg, setPayMsg] = useState("");

  // Enquiry responses
  const [enquiryResponses, setEnquiryResponses] = useState({});
  const [enquiryMsg, setEnquiryMsg] = useState({});

  // ---------------- Loaders ----------------
  const loadStats = useCallback(async () => {
    try {
      const data = await api("/pensions/admin/stats");
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter) qs.set("application_type", typeFilter);
      const data = await api(`/pensions/admin/applications?${qs}`);
      setApplications(data.applications || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  const loadMembers = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (memberFilter) qs.set("status", memberFilter);
      const data = await api(`/pensions/admin/members?${qs}`);
      setMembers(data.members || []);
    } catch (err) { console.error(err); }
  }, [memberFilter]);

  const loadContributions = useCallback(async (memberId) => {
    if (!memberId) return;
    try {
      const data = await api(`/pensions/admin/members/${memberId}/contributions`);
      setContributions(data.contributions || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const data = await api("/pensions/admin/payments");
      setPayments(data.payments || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadDebts = useCallback(async () => {
    try {
      const data = await api("/pensions/admin/debts");
      setDebts(data.debts || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadEnquiries = useCallback(async () => {
    try {
      const data = await api("/pensions/admin/enquiries");
      setEnquiries(data.enquiries || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const data = await api("/pensions/admin/audit");
      setAudit(data.logs || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadApplications(); }, [loadApplications]);
  useEffect(() => {
    if (tab === "members" || tab === "contributions") loadMembers();
    if (tab === "payments") loadPayments();
    if (tab === "debts") loadDebts();
    if (tab === "enquiries") loadEnquiries();
    if (tab === "audit") loadAudit();
  }, [tab, loadMembers, loadPayments, loadDebts, loadEnquiries, loadAudit]);

  // ---------------- Application actions ----------------
  async function openApplication(id) {
    try {
      const data = await api(`/pensions/applications/${id}`);
      setSelected(data.application);
      setDetail(data);
      setNote("");
      setAssessmentMsg("");
    } catch (err) { alert(err.message); }
  }

  async function setStatus(newStatus) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api(`/pensions/admin/applications/${selected.application_id}/status`, {
        method: "POST",
        body: JSON.stringify({ newStatus, note })
      });
      await openApplication(selected.application_id);
      await loadApplications();
      await loadStats();
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  }

  async function submitAssessment(e) {
    e.preventDefault();
    setAssessmentMsg("");
    if (!assessmentForm.gross_amount) {
      setAssessmentMsg("Error: Enter the gross amount first.");
      return;
    }
    try {
      await api(`/pensions/admin/applications/${selected.application_id}/assessment`, {
        method: "POST",
        body: JSON.stringify(assessmentForm)
      });
      setAssessmentMsg("Assessment saved.");
      setAssessmentForm({
        gross_amount: "",
        calculation_notes: "",
        approval_status: "PENDING_AUTHORITY"
      });
      await openApplication(selected.application_id);
    } catch (err) { setAssessmentMsg("Error: " + err.message); }
  }

  // ---------------- Member actions ----------------
  async function setMemberStatus(memberId, membership_status, identity_verification_status) {
    try {
      await api(`/pensions/admin/members/${memberId}/status`, {
        method: "POST",
        body: JSON.stringify({ membership_status, identity_verification_status })
      });
      await loadMembers();
      await loadStats();
    } catch (err) { alert(err.message); }
  }

  // ---------------- Contribution recording ----------------
  async function submitContribution(e) {
    e.preventDefault();
    setContribMsg("");
    if (!contribForm.member_id || !contribForm.contribution_period) {
      setContribMsg("Error: Member and period are required.");
      return;
    }
    try {
      await api("/pensions/admin/contributions", {
        method: "POST",
        body: JSON.stringify(contribForm)
      });
      setContribMsg("Contribution recorded.");
      setContribForm({
        member_id: "",
        contribution_period: "",
        member_contribution: "",
        employer_contribution: ""
      });
    } catch (err) { setContribMsg("Error: " + err.message); }
  }

  // ---------------- Payment recording ----------------
  async function submitPayment(e) {
    e.preventDefault();
    setPayMsg("");
    if (!payForm.member_id || !payForm.amount) {
      setPayMsg("Error: Member and amount are required.");
      return;
    }
    try {
      await api("/pensions/admin/payments", {
        method: "POST",
        body: JSON.stringify(payForm)
      });
      setPayMsg("Payment recorded.");
      setPayForm({
        member_id: "",
        programme_code: "PODCPF",
        payment_period: "",
        amount: "",
        payment_method: "BANK",
        status: "PAID",
        provider_reference: ""
      });
      await loadPayments();
    } catch (err) { setPayMsg("Error: " + err.message); }
  }

  // ---------------- Debt actions ----------------
  async function setDebtStatus(debtId, verification_status) {
    try {
      await api(`/pensions/admin/debts/${debtId}/status`, {
        method: "POST",
        body: JSON.stringify({ verification_status })
      });
      await loadDebts();
    } catch (err) { alert(err.message); }
  }

  // ---------------- Enquiry actions ----------------
  async function respondToEnquiry(enquiryId) {
    const text = enquiryResponses[enquiryId];
    if (!text) return;
    try {
      await api(`/pensions/admin/enquiries/${enquiryId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: text, status: "RESOLVED" })
      });
      setEnquiryMsg(prev => ({ ...prev, [enquiryId]: "Response sent." }));
      await loadEnquiries();
    } catch (err) {
      setEnquiryMsg(prev => ({ ...prev, [enquiryId]: "Error: " + err.message }));
    }
  }

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
              <p style={header.eyebrow}>Ministry of Pensions · Administrator</p>
              <h1 style={header.title}>Pensions Admin Dashboard</h1>
              <p style={header.subtitle}>
                Review registrations, verify members, process benefits and monitor payments.
              </p>
            </div>
            <span style={header.liveBadge}>
              <span style={header.liveDot} />
              {stats.pendingApplications || 0} pending
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
          <Metric label="Paid" value={stats.paidApplications || 0} />
          <Metric label="Registered members" value={stats.totalMembers || 0} />
          <Metric label="Open enquiries" value={stats.openEnquiries || 0} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["applications", `Applications (${applications.length})`],
            ["members", `Members (${members.length})`],
            ["contributions", "Contributions"],
            ["payments", `Payments (${payments.length})`],
            ["debts", `Debts (${debts.length})`],
            ["enquiries", `Enquiries (${enquiries.length})`],
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

        {/* APPLICATIONS TAB */}
        {tab === "applications" && (
          <section style={grids.twoCol}>
            <article style={cards.cardPadded}>
              <h2 style={section.title}>Applications queue</h2>
              <p style={section.subtitle}>
                Review submitted registrations and benefit applications.
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
                  {REQUEST_TYPE_FILTERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
                  {REQUEST_STATUS_FILTERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>

              {loading && <p style={{ color: COLORS.textMuted }}>Loading…</p>}
              {error && <p style={{ color: COLORS.error }}>{error}</p>}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 44 }}></th>
                      {["Ref", "Applicant", "Type", "Status", ""].map(h =>
                        <th key={h} style={thStyle}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.length === 0 && !loading && (
                      <tr><td colSpan={5} style={{ padding: 16, color: COLORS.textMuted }}>
                        No applications.
                      </td></tr>
                    )}
                    {applications.map(a => (
                      <tr key={a.application_id}>
                        <td style={{ ...tdStyle, width: 44 }}>
                          {a.photo_url ? (
                            <img src={a.photo_url} alt={a.full_name}
                              style={{ width: 34, height: 42, borderRadius: 4, objectFit: "cover" }} />
                          ) : (
                            <div style={{
                              width: 34, height: 42, borderRadius: 4,
                              background: COLORS.lightBg, border: `1px solid ${COLORS.borderLight}`
                            }} />
                          )}
                        </td>
                        <td style={tdStyle}><strong>{a.reference_number}</strong></td>
                        <td style={tdStyle}>{a.full_name || "—"}</td>
                        <td style={tdStyle}>{a.application_type.replace(/_/g, " ")}</td>
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

            <aside style={cards.cardPadded}>
              {!selected && (
                <>
                  <h2 style={section.title}>Application detail</h2>
                  <p style={section.subtitle}>Select an application to review.</p>
                </>
              )}

              {selected && (
                <>
                  <h2 style={{ margin: 0, color: COLORS.blue, fontSize: 16 }}>
                    {selected.reference_number}
                  </h2>
                  <p style={{ margin: "4px 0 14px", fontSize: 12, color: COLORS.textMuted }}>
                    {selected.application_type.replace(/_/g, " ")} · {selected.programme_name}
                  </p>

                  <Row label="Applicant" value={selected.full_name} />
                  <Row label="National ID" value={selected.national_id || "—"} />
                  <Row label="Email" value={selected.email || "—"} />
                  <Row label="Phone" value={selected.phone || "—"} />
                  <Row label="Status" value={<StatusBadge status={selected.status} />} />

                  {detail?.documents?.length > 0 && (
                    <>
                      <h3 style={subHeading}>Documents</h3>
                      <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                        {detail.documents.map(d => (
                          <li key={d.document_id}>
                            <a href={`${API_BASE.replace("/api", "")}${d.storage_key}`}
                               target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
                              {d.original_filename}
                            </a>{" "}
                            <small style={{ color: COLORS.textMuted }}>({d.review_status})</small>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <h3 style={subHeading}>Quick actions</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      ["UNDER_REVIEW", "Under review", COLORS.blue],
                      ["MORE_INFORMATION_REQUIRED", "Request info", "#b45309"],
                      ["VERIFICATION_PENDING", "Verification", "#b45309"],
                      ["APPROVED", "Approve", COLORS.green],
                      ["REJECTED", "Reject", COLORS.error],
                      ["PAYMENT_PENDING", "Payment pending", "#0f766e"],
                      ["PAID", "Mark paid", "#6651aa"],
                      ["CLOSED", "Close", "#475569"]
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

                  <h3 style={subHeading}>Officer note</h3>
                  <textarea
                    placeholder="Optional note for the applicant"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />

                  <h3 style={subHeading}>Record benefit assessment</h3>
                  <form onSubmit={submitAssessment}>
                    <label style={labelStyle}>Gross amount (LSL)</label>
                    <input type="number" step="0.01" placeholder="0.00"
                      value={assessmentForm.gross_amount}
                      onChange={e => setAssessmentForm(p => ({ ...p, gross_amount: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 8 }} />
                    <label style={labelStyle}>Calculation notes</label>
                    <textarea placeholder="Calculation notes" rows={2}
                      value={assessmentForm.calculation_notes}
                      onChange={e => setAssessmentForm(p => ({ ...p, calculation_notes: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 8 }} />
                    <label style={labelStyle}>Approval status</label>
                    <select value={assessmentForm.approval_status}
                      onChange={e => setAssessmentForm(p => ({ ...p, approval_status: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 8 }}>
                      <option value="NOT_REVIEWED">Not reviewed</option>
                      <option value="PENDING_AUTHORITY">Pending authority</option>
                      <option value="AUTHORISED">Authorised</option>
                      <option value="DECLINED">Declined</option>
                    </select>
                    <button type="submit" style={btnSmall}>Save assessment</button>
                    {assessmentMsg && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: assessmentMsg.startsWith("Error") ? COLORS.error : COLORS.green
                      }}>{assessmentMsg}</p>
                    )}
                  </form>

                  <div style={{ textAlign: "right", marginTop: 16 }}>
                    <button
                      onClick={() => { setSelected(null); setDetail(null); }}
                      style={btnSmall}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </aside>
          </section>
        )}

        {/* MEMBERS TAB */}
        {tab === "members" && (
          <section>
            <h2 style={section.title}>Registered members</h2>
            <p style={section.subtitle}>
              Verify identity and set the membership status for each member.
            </p>

            <div style={{ marginBottom: 16 }}>
              <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)} style={selectStyle}>
                {MEMBER_STATUS_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>

            {members.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No members found.</p>
            )}

            {members.map(m => (
              <article key={m.member_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  gap: 12, flexWrap: "wrap"
                }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{m.full_name}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Member {m.member_number} · {m.programme_name}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      {m.email || "—"} · {m.phone || "—"} · {m.national_id || "—"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <StatusBadge status={m.membership_status} />
                    <StatusBadge status={m.identity_verification_status} />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setMemberStatus(m.member_id, "ACTIVE", "VERIFIED")}
                    style={miniBtn(COLORS.green)}
                  >
                    Activate & verify
                  </button>
                  <button
                    onClick={() => setMemberStatus(m.member_id, "PENDING_VERIFICATION", "PENDING")}
                    style={miniBtn(COLORS.blue)}
                  >
                    Reset to pending
                  </button>
                  <button
                    onClick={() => setMemberStatus(m.member_id, "RETIRED", m.identity_verification_status)}
                    style={miniBtn("#6651aa")}
                  >
                    Mark retired
                  </button>
                  <button
                    onClick={() => setMemberStatus(m.member_id, "SUSPENDED", m.identity_verification_status)}
                    style={miniBtn(COLORS.error)}
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => {
                      setContribForm(p => ({ ...p, member_id: m.member_id }));
                      setTab("contributions");
                      loadContributions(m.member_id);
                    }}
                    style={miniBtn(COLORS.blue)}
                  >
                    View contributions
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* CONTRIBUTIONS TAB */}
        {tab === "contributions" && (
          <section>
            <h2 style={section.title}>Contributions</h2>
            <p style={section.subtitle}>
              View or record member and employer contribution information.
            </p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 20, marginBottom: 20
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                Record a contribution
              </h3>
              <form onSubmit={submitContribution}>
                <label style={labelStyle}>Member</label>
                <select
                  required
                  value={contribForm.member_id}
                  onChange={e => {
                    setContribForm(p => ({ ...p, member_id: e.target.value }));
                    loadContributions(e.target.value);
                  }}
                  style={{ ...inputStyle, marginBottom: 14 }}
                >
                  <option value="">Select member…</option>
                  {members.map(m => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.full_name} · {m.member_number}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Contribution period (first day of month)</label>
                <input type="date" required value={contribForm.contribution_period}
                  onChange={e => setContribForm(p => ({ ...p, contribution_period: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Member contribution (LSL)</label>
                <input type="number" step="0.01" value={contribForm.member_contribution}
                  onChange={e => setContribForm(p => ({ ...p, member_contribution: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Employer contribution (LSL)</label>
                <input type="number" step="0.01" value={contribForm.employer_contribution}
                  onChange={e => setContribForm(p => ({ ...p, employer_contribution: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                {contribMsg && (
                  <p style={{
                    color: contribMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{contribMsg}</p>
                )}
                <button type="submit" style={btnSmall}>Record contribution</button>
              </form>
            </div>

            {contribForm.member_id && (
              <>
                <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>
                  Contribution history
                </h3>
                {contributions.length === 0 && (
                  <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                    No contributions recorded for this member.
                  </p>
                )}
                {contributions.map(c => (
                  <article key={c.contribution_id} style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: 16, marginBottom: 10
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      gap: 12, flexWrap: "wrap"
                    }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>
                          {new Date(c.contribution_period).toLocaleDateString(undefined, {
                            month: "long", year: "numeric"
                          })}
                        </strong>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                          Member: M {Number(c.member_contribution).toFixed(2)} · Employer:{" "}
                          M {Number(c.employer_contribution).toFixed(2)}
                        </p>
                      </div>
                      <StatusBadge status={c.reconciliation_status} />
                    </div>
                  </article>
                ))}
              </>
            )}
          </section>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <section>
            <h2 style={section.title}>Pension payments</h2>
            <p style={section.subtitle}>
              Record and monitor authorised pension payments.
            </p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 20, marginBottom: 20
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                Record a payment
              </h3>
              <form onSubmit={submitPayment}>
                <label style={labelStyle}>Member</label>
                <select
                  required
                  value={payForm.member_id}
                  onChange={e => setPayForm(p => ({ ...p, member_id: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}
                >
                  <option value="">Select member…</option>
                  {members.map(m => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.full_name} · {m.member_number}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Programme</label>
                <select value={payForm.programme_code}
                  onChange={e => setPayForm(p => ({ ...p, programme_code: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="PODCPF">Public Officers’ Defined Contribution Pension Fund</option>
                  <option value="OAP">Old Age Pension</option>
                </select>

                <label style={labelStyle}>Payment period</label>
                <input type="date" value={payForm.payment_period}
                  onChange={e => setPayForm(p => ({ ...p, payment_period: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Amount (LSL)</label>
                <input type="number" step="0.01" required value={payForm.amount}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Method</label>
                <select value={payForm.payment_method}
                  onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="BANK">Bank</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                  <option value="POST_OFFICE">Post office</option>
                  <option value="AUTHORISED_PAY_POINT">Authorised pay point</option>
                  <option value="OTHER">Other</option>
                </select>

                <label style={labelStyle}>Status</label>
                <select value={payForm.status}
                  onChange={e => setPayForm(p => ({ ...p, status: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="PENDING">Pending</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="RECONCILIATION_REQUIRED">Reconciliation required</option>
                </select>

                <label style={labelStyle}>Provider reference (optional)</label>
                <input value={payForm.provider_reference}
                  onChange={e => setPayForm(p => ({ ...p, provider_reference: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                {payMsg && (
                  <p style={{
                    color: payMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{payMsg}</p>
                )}
                <button type="submit" style={btnSmall}>Record payment</button>
              </form>
            </div>

            <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>
              Payment history
            </h3>
            <div style={cards.cardPadded}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Reference", "Beneficiary", "Amount", "Period", "Status"].map(h =>
                      <th key={h} style={thStyle}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.payment_id}>
                      <td style={tdStyle}>{p.payment_reference}</td>
                      <td style={tdStyle}>{p.full_name || "—"}</td>
                      <td style={tdStyle}>M {Number(p.amount).toFixed(2)}</td>
                      <td style={tdStyle}>
                        {p.payment_period
                          ? new Date(p.payment_period).toLocaleDateString()
                          : "—"}
                      </td>
                      <td style={tdStyle}><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 16, color: COLORS.textMuted }}>
                      No payments recorded.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* DEBTS TAB */}
        {tab === "debts" && (
          <section>
            <h2 style={section.title}>Government debt deductions</h2>
            <p style={section.subtitle}>
              Review deductions such as salary advances, salary overpayments,
              government loans, bursaries and income tax.
            </p>

            {debts.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                No debt records.
              </p>
            )}

            {debts.map(d => (
              <article key={d.debt_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  gap: 12, flexWrap: "wrap"
                }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>
                      {d.debt_type.replace(/_/g, " ")} · M {Number(d.amount_recorded).toFixed(2)}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Member: {d.full_name} · {d.member_number}
                    </p>
                    {d.description && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                        {d.description}
                      </p>
                    )}
                    {d.source_department && (
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                        Source: {d.source_department}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={d.verification_status} />
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setDebtStatus(d.debt_id, "VERIFIED")} style={miniBtn(COLORS.green)}>
                    Verify
                  </button>
                  <button onClick={() => setDebtStatus(d.debt_id, "DISPUTED")} style={miniBtn("#b45309")}>
                    Dispute
                  </button>
                  <button onClick={() => setDebtStatus(d.debt_id, "RESOLVED")} style={miniBtn("#6651aa")}>
                    Resolve
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ENQUIRIES TAB */}
        {tab === "enquiries" && (
          <section>
            <h2 style={section.title}>Enquiries & complaints</h2>
            <p style={section.subtitle}>
              Investigate and respond to delayed payments, missing payments,
              incorrect deductions and contribution discrepancies.
            </p>

            {enquiries.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No enquiries.</p>
            )}

            {enquiries.map(e => (
              <article key={e.enquiry_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  gap: 12, flexWrap: "wrap"
                }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{e.subject}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                      {e.reference_number} · {e.enquiry_type.replace(/_/g, " ")} ·{" "}
                      {e.full_name} · {e.email}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textMid }}>
                  {e.description}
                </p>
                {e.response ? (
                  <div style={{
                    margin: "10px 0 0", padding: 10,
                    background: COLORS.blueLight, borderRadius: 6,
                    fontSize: 12, color: COLORS.textMid
                  }}>
                    <strong>Your response:</strong> {e.response}
                  </div>
                ) : (
                  <>
                    <textarea
                      placeholder="Your response"
                      value={enquiryResponses[e.enquiry_id] || ""}
                      onChange={ev => setEnquiryResponses(p => ({
                        ...p, [e.enquiry_id]: ev.target.value
                      }))}
                      rows={2}
                      style={{ ...inputStyle, marginTop: 10, marginBottom: 8 }}
                    />
                    <button onClick={() => respondToEnquiry(e.enquiry_id)} style={btnSmall}>
                      Send response
                    </button>
                    {enquiryMsg[e.enquiry_id] && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: enquiryMsg[e.enquiry_id].startsWith("Error")
                          ? COLORS.error : COLORS.green
                      }}>{enquiryMsg[e.enquiry_id]}</p>
                    )}
                  </>
                )}
              </article>
            ))}
          </section>
        )}

        {/* AUDIT TAB */}
        {tab === "audit" && (
          <section>
            <h2 style={section.title}>Audit log</h2>
            <p style={section.subtitle}>
              Recorded administrative actions on pension records.
            </p>
            <div style={cards.cardPadded}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Timestamp", "Actor", "Action", "Entity"].map(h =>
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
                      <td style={tdStyle}>
                        {l.entity_type} #{l.entity_id || "—"}
                      </td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 16, color: COLORS.textMuted }}>
                      No audit records.
                    </td></tr>
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
// Sub-components
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
        textAlign: "right", wordBreak: "break-word"
      }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT:                      { bg: "#f1f5f9", fg: "#475569" },
    SUBMITTED:                  { bg: "#eff8ff", fg: "#175cd3" },
    UNDER_REVIEW:               { bg: "#fff4df", fg: "#b45309" },
    MORE_INFORMATION_REQUIRED:  { bg: "#fff4df", fg: "#b45309" },
    VERIFICATION_PENDING:       { bg: "#fff4df", fg: "#b45309" },
    APPROVED:                   { bg: "#ecfdf3", fg: "#067647" },
    REJECTED:                   { bg: "#fdecea", fg: "#b3261e" },
    PAYMENT_PENDING:            { bg: "#e6f4f1", fg: "#0f766e" },
    PAID:                       { bg: "#f0edfc", fg: "#6651aa" },
    CLOSED:                     { bg: "#f1f5f9", fg: "#475569" },
    CANCELLED:                  { bg: "#f1f5f9", fg: "#475569" },
    PENDING_VERIFICATION:       { bg: "#fff4df", fg: "#b45309" },
    ACTIVE:                     { bg: "#ecfdf3", fg: "#067647" },
    RETIRED:                    { bg: "#f0edfc", fg: "#6651aa" },
    RESIGNED:                   { bg: "#f1f5f9", fg: "#475569" },
    TERMINATED:                 { bg: "#fdecea", fg: "#b3261e" },
    DECEASED:                   { bg: "#f1f5f9", fg: "#475569" },
    SUSPENDED:                  { bg: "#fdecea", fg: "#b3261e" },
    NOT_CHECKED:                { bg: "#f1f5f9", fg: "#475569" },
    PENDING:                    { bg: "#fff4df", fg: "#b45309" },
    VERIFIED:                   { bg: "#ecfdf3", fg: "#067647" },
    FAILED:                     { bg: "#fdecea", fg: "#b3261e" },
    MATCHED:                    { bg: "#ecfdf3", fg: "#067647" },
    DISCREPANCY:                { bg: "#fdecea", fg: "#b3261e" },
    CONFIRMED:                  { bg: "#ecfdf3", fg: "#067647" },
    SCHEDULED:                  { bg: "#eff8ff", fg: "#175cd3" },
    PROCESSING:                 { bg: "#e6f4f1", fg: "#0f766e" },
    RECONCILIATION_REQUIRED:    { bg: "#fff4df", fg: "#b45309" },
    OPEN:                       { bg: "#eff8ff", fg: "#175cd3" },
    RESPONDED:                  { bg: "#ecfdf3", fg: "#067647" },
    RESOLVED:                   { bg: "#ecfdf3", fg: "#067647" },
    DISPUTED:                   { bg: "#fff4df", fg: "#b45309" },
    NOT_CONFIRMED:              { bg: "#f1f5f9", fg: "#475569" },
    REQUIRES_REVIEW:            { bg: "#fff4df", fg: "#b45309" },
    ACCEPTED:                   { bg: "#ecfdf3", fg: "#067647" },
    REPLACEMENT_REQUIRED:       { bg: "#fff4df", fg: "#b45309" }
  };
  const s = map[status] || { bg: "#f1f5f9", fg: "#475569" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      background: s.bg, color: s.fg, borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 0.4, whiteSpace: "nowrap"
    }}>{(status || "").replace(/_/g, " ")}</span>
  );
}

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
const miniBtn = (bg) => ({
  padding: "6px 10px", border: 0, background: bg,
  color: "#fff", borderRadius: 4, cursor: "pointer",
  fontWeight: 700, fontSize: 11, fontFamily: "inherit"
});
const subHeading = {
  fontSize: 12, color: COLORS.textMuted,
  textTransform: "uppercase", marginTop: 18,
  marginBottom: 6, letterSpacing: 0.6, fontWeight: 700
};
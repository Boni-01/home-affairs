import React, { useEffect, useState, useCallback, useRef } from "react";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import { auth, API_BASE } from "../Database/firebase";

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

const APPLICATION_ICONS = {
  REGISTRATION: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V4h11l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M15 4v5h5" />
      <path d="M8 12h8M8 16h8" />
    </svg>
  ),
  RETIREMENT_BENEFIT: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10h16M6 10V7.5A1.5 1.5 0 0 1 7.5 6h9A1.5 1.5 0 0 1 18 7.5V10" />
      <path d="M7 10v9h10v-9" />
      <path d="M10 14h4" />
    </svg>
  ),
  RESIGNATION_BENEFIT: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 7h8" />
      <path d="M9 11h6" />
      <path d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M12 15h.01" />
    </svg>
  ),
  TERMINATION_BENEFIT: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5h14v14H5z" />
      <path d="M8 8h8v8H8z" />
      <path d="M10 12h4" />
    </svg>
  ),
  RETRENCHMENT_BENEFIT: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 16l6-8 4 6 6-8" />
      <path d="M18 6h2v2" />
      <path d="M4 20h16" />
    </svg>
  ),
  DISABILITY_BENEFIT: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" />
      <path d="M9 10h6M12 7v6" />
      <path d="M8 16c1-1 3-1.5 4-1.5s3 .5 4 1.5" />
    </svg>
  ),
  DEATH_BENEFIT: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-6-3.5-6-8.5A3.5 3.5 0 0 1 9.5 8c1.1 0 2.2.5 3 1.4A3.8 3.8 0 0 1 15.5 8 3.5 3.5 0 0 1 19 11.5C19 16.5 13 20 12 20z" />
    </svg>
  ),
  OLD_AGE_PENSION: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M4 18a5 5 0 0 1 10 0" />
      <path d="M16 8h4M18 6v4" />
      <path d="M15 18h5" />
    </svg>
  ),
  RECORD_CORRECTION: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V4h11l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M15 4v5h5" />
      <path d="M8 12l2 2 5-5" />
    </svg>
  ),
  OTHER: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8M8 17h8" />
    </svg>
  )
};

const APPLICATION_TYPES = [
  { key: "REGISTRATION",         label: "Pension registration",        icon: APPLICATION_ICONS.REGISTRATION, needsDocs: true },
  { key: "RETIREMENT_BENEFIT",   label: "Retirement benefit",          icon: APPLICATION_ICONS.RETIREMENT_BENEFIT, needsDocs: true },
  { key: "RESIGNATION_BENEFIT",  label: "Resignation benefit",         icon: APPLICATION_ICONS.RESIGNATION_BENEFIT, needsDocs: true },
  { key: "TERMINATION_BENEFIT",  label: "Termination benefit",         icon: APPLICATION_ICONS.TERMINATION_BENEFIT, needsDocs: true },
  { key: "RETRENCHMENT_BENEFIT", label: "Retrenchment benefit",        icon: APPLICATION_ICONS.RETRENCHMENT_BENEFIT, needsDocs: true },
  { key: "DISABILITY_BENEFIT",   label: "Disability benefit",          icon: APPLICATION_ICONS.DISABILITY_BENEFIT, needsDocs: true },
  { key: "DEATH_BENEFIT",        label: "Death / survivor benefit",    icon: APPLICATION_ICONS.DEATH_BENEFIT, needsDocs: true },
  { key: "OLD_AGE_PENSION",      label: "Old Age Pension application", icon: APPLICATION_ICONS.OLD_AGE_PENSION, needsDocs: true },
  { key: "RECORD_CORRECTION",    label: "Record correction",           icon: APPLICATION_ICONS.RECORD_CORRECTION, needsDocs: false },
  { key: "OTHER",                label: "Other pension request",       icon: APPLICATION_ICONS.OTHER, needsDocs: false }
];

const ENQUIRY_TYPES = [
  { key: "DELAYED_PAYMENT",        label: "Delayed payment" },
  { key: "MISSING_PAYMENT",        label: "Missing payment" },
  { key: "INCORRECT_DEDUCTION",    label: "Incorrect deduction" },
  { key: "CONTRIBUTION_DISCREPANCY", label: "Contribution discrepancy" },
  { key: "BENEFIT_QUERY",          label: "Benefit query" },
  { key: "ELIGIBILITY_QUERY",      label: "Eligibility query" },
  { key: "PROFILE_CORRECTION",     label: "Profile correction" },
  { key: "COMPLAINT",              label: "Complaint" },
  { key: "OTHER",                  label: "Other" }
];

function PensionsDashboard() {
  const [tab, setTab] = useState("overview");
  const [me, setMe] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  const [profile, setProfile] = useState({ member: null, programme: null, contributions_summary: null });
  const [applications, setApplications] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [estimate, setEstimate] = useState(null);

  const [activeType, setActiveType] = useState(null);
  const [details, setDetails] = useState({});
  const [docs, setDocs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const [regForm, setRegForm] = useState({
    programme_code: "PODCPF",
    date_of_birth: "",
    employment_number: "",
    employer_name: "",
    employment_start_date: "",
    employment_end_date: ""
  });
  const [regDocs, setRegDocs] = useState([]);
  const [regMsg, setRegMsg] = useState("");

  const [enquiryForm, setEnquiryForm] = useState({
    enquiry_type: "DELAYED_PAYMENT",
    subject: "",
    description: ""
  });
  const [enquiryMsg, setEnquiryMsg] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [
        meRes, progRes, profileRes, appsRes, contribRes,
        payRes, enqRes, notifRes, estRes
      ] = await Promise.all([
        api("/me"),
        api("/pensions/programmes"),
        api("/pensions/me"),
        api("/pensions/applications/my"),
        api("/pensions/contributions/my"),
        api("/pensions/payments/my"),
        api("/pensions/enquiries/my"),
        api("/pensions/notifications"),
        api("/pensions/estimate/my")
      ]);
      setMe(meRes.user);
      setProgrammes(progRes.programmes || []);
      setProfile({
        member: profileRes.member,
        programme: profileRes.programme,
        contributions_summary: profileRes.contributions_summary
      });
      setApplications(appsRes.applications || []);
      setContributions(contribRes.contributions || []);
      setPayments(payRes.payments || []);
      setEnquiries(enqRes.enquiries || []);
      setNotifications(notifRes.notifications || []);
      setEstimate(estRes.estimate || null);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---------------- Registration ----------------
  async function submitRegistration(e) {
    e.preventDefault();
    setRegMsg("");
    try {
      const fd = new FormData();
      Object.entries(regForm).forEach(([k, v]) => fd.append(k, v));
      for (const f of regDocs) if (f instanceof File) fd.append("documents", f, f.name);
      const res = await api("/pensions/register", { method: "POST", body: fd });
      setRegMsg(`Registration submitted. Reference: ${res.referenceNumber}`);
      setRegForm({
        programme_code: "PODCPF",
        date_of_birth: "",
        employment_number: "",
        employer_name: "",
        employment_start_date: "",
        employment_end_date: ""
      });
      setRegDocs([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setRegMsg("Error: " + err.message);
    }
  }

  // ---------------- Application submit ----------------
  function openType(t) {
    setActiveType(t);
    setDetails({});
    setDocs([]);
    setSubmitError("");
  }
  function closeType() {
    setActiveType(null);
    setDetails({});
    setDocs([]);
  }

  async function submitApplication(e) {
    e.preventDefault();
    setSubmitError("");
    if (!activeType) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("application_type", activeType.key);
      if (profile.programme?.programme_code) {
        fd.append("programme_code", profile.programme.programme_code);
      }
      fd.append("details", JSON.stringify(details));
      for (const f of docs) if (f instanceof File) fd.append("documents", f, f.name);
      const res = await api("/pensions/applications", { method: "POST", body: fd });
      closeType();
      await load();
      alert(`Submitted. Reference: ${res.referenceNumber}`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------- Detail / delete ----------------
  async function openDetail(id) {
    try {
      const data = await api(`/pensions/applications/${id}`);
      setSelected(data.application);
      setDetail(data);
    } catch (err) { alert(err.message); }
  }

  async function deleteApplication(a) {
    if (!window.confirm(`Delete application ${a.reference_number}? This cannot be undone.`)) return;
    setDeletingId(a.application_id);
    try {
      await api(`/pensions/applications/${a.application_id}`, { method: "DELETE" });
      if (selected?.application_id === a.application_id) {
        setSelected(null); setDetail(null);
      }
      await load();
    } catch (err) {
      alert("Could not delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // ---------------- Enquiries ----------------
  async function submitEnquiry(e) {
    e.preventDefault();
    setEnquiryMsg("");
    try {
      const res = await api("/pensions/enquiries", {
        method: "POST",
        body: JSON.stringify(enquiryForm)
      });
      setEnquiryMsg(`Submitted. Reference: ${res.reference}`);
      setEnquiryForm({ enquiry_type: "DELAYED_PAYMENT", subject: "", description: "" });
      await load();
    } catch (err) {
      setEnquiryMsg("Error: " + err.message);
    }
  }

  async function markRead(id) {
    try {
      await api(`/pensions/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev =>
        prev.map(n => n.notification_id === id
          ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (err) { console.error(err); }
  }

  const unread = notifications.filter(n => !n.read_at).length;
  const deletableStatuses = ["DRAFT","SUBMITTED","MORE_INFORMATION_REQUIRED"];
  const isMember = !!profile.member;

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={header.content}>
            <p style={header.eyebrow}>Ministry of Pensions</p>
            <h1 style={header.title}>Pensions Dashboard</h1>
            {me && (
              <p style={header.subtitle}>
                Signed in as {me.full_name} · National ID:{" "}
                <strong>{me.national_id_number || me.national_id || "—"}</strong>
              </p>
            )}
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16, marginBottom: 28
        }}>
          <StatCard label="My applications" value={applications.length} accent={COLORS.blue} />
          <StatCard label="Payments" value={payments.length} accent={COLORS.green} />
          <StatCard label="Contributions" value={contributions.length} accent={COLORS.blue} />
          <StatCard label="Notifications" value={unread} accent={COLORS.blue} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["overview", "Overview"],
            ["apply", "Submit application"],
            ["mine", `My applications (${applications.length})`],
            ["contributions", `Contributions (${contributions.length})`],
            ["payments", `Payments (${payments.length})`],
            ["enquiries", `Enquiries (${enquiries.length})`],
            ["notifications", `Notifications${unread ? ` (${unread})` : ""}`]
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

        {/* ---------------- Overview ---------------- */}
        {tab === "overview" && (
          <section>
            <h2 style={section.title}>Pension overview</h2>
            <p style={section.subtitle}>Your membership, contributions and benefit estimate.</p>

            {!isMember && (
              <div style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: 24, marginBottom: 20
              }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                  Register as a pension member
                </h3>
                <form onSubmit={submitRegistration}>
                  <label style={labelStyle}>Programme</label>
                  <select value={regForm.programme_code}
                    onChange={e => setRegForm(p => ({ ...p, programme_code: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: 14 }}>
                    {programmes.map(p => (
                      <option key={p.programme_code} value={p.programme_code}>
                        {p.programme_name}
                      </option>
                    ))}
                  </select>

                  <label style={labelStyle}>Date of birth</label>
                  <input type="date" value={regForm.date_of_birth}
                    onChange={e => setRegForm(p => ({ ...p, date_of_birth: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: 14 }} />

                  <label style={labelStyle}>Employment number</label>
                  <input value={regForm.employment_number}
                    onChange={e => setRegForm(p => ({ ...p, employment_number: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: 14 }} />

                  <label style={labelStyle}>Employer name</label>
                  <input value={regForm.employer_name}
                    onChange={e => setRegForm(p => ({ ...p, employer_name: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: 14 }} />

                  <label style={labelStyle}>Employment start date</label>
                  <input type="date" value={regForm.employment_start_date}
                    onChange={e => setRegForm(p => ({ ...p, employment_start_date: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: 14 }} />

                  <label style={labelStyle}>Employment end date</label>
                  <input type="date" value={regForm.employment_end_date}
                    onChange={e => setRegForm(p => ({ ...p, employment_end_date: e.target.value }))}
                    style={{ ...inputStyle, marginBottom: 14 }} />

                  <label style={labelStyle}>Supporting documents (ID, employment record etc.)</label>
                  <input type="file" multiple ref={fileInputRef}
                    onChange={e => setRegDocs(Array.from(e.target.files || []))}
                    style={{ marginBottom: 14 }} />

                  {regMsg && (
                    <p style={{
                      color: regMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                      fontSize: 13, marginBottom: 12
                    }}>{regMsg}</p>
                  )}
                  <button type="submit" style={btnPrimary}>Register</button>
                </form>
              </div>
            )}

            {isMember && (
              <>
                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 20, marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 14, color: COLORS.blue }}>
                    My membership
                  </h3>
                  <Row label="Member number" value={profile.member.member_number} />
                  <Row label="Programme" value={profile.programme?.programme_name || "—"} />
                  <Row label="Membership status" value={
                    <StatusBadge status={profile.member.membership_status} />
                  } />
                  <Row label="Identity verification" value={
                    <StatusBadge status={profile.member.identity_verification_status} />
                  } />
                  {profile.member.employer_name && (
                    <Row label="Employer" value={profile.member.employer_name} />
                  )}
                </div>

                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 20, marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 14, color: COLORS.blue }}>
                    Contributions summary
                  </h3>
                  {profile.contributions_summary ? (
                    <>
                      <Row label="Months recorded" value={profile.contributions_summary.months_recorded || 0} />
                      <Row label="Member contributions" value={`M ${Number(profile.contributions_summary.total_member || 0).toFixed(2)}`} />
                      <Row label="Employer contributions" value={`M ${Number(profile.contributions_summary.total_employer || 0).toFixed(2)}`} />
                      <Row label="Combined total" value={`M ${Number(profile.contributions_summary.total_combined || 0).toFixed(2)}`} />
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted }}>
                      No contribution records yet.
                    </p>
                  )}
                </div>

                {estimate && (
                  <div style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 20
                  }}>
                    <h3 style={{ margin: "0 0 10px", fontSize: 14, color: COLORS.blue }}>
                      Illustrative benefit estimate
                    </h3>
                    <Row label="Illustrative monthly benefit"
                      value={`M ${Number(estimate.illustrative_monthly_benefit || 0).toFixed(2)}`} />
                    <Row label="Illustrative annual benefit"
                      value={`M ${Number(estimate.illustrative_annual_benefit || 0).toFixed(2)}`} />
                    <p style={{
                      margin: "12px 0 0", padding: 10,
                      background: COLORS.blueLight, borderRadius: 6,
                      fontSize: 12, color: COLORS.textMid, lineHeight: 1.5
                    }}>
                      {estimate.note}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ---------------- Apply ---------------- */}
        {tab === "apply" && (
          <section>
            <h2 style={section.title}>Submit a pension application</h2>
            <p style={section.subtitle}>
              Choose the type of application you want to submit. We'll ask for the
              required details and supporting documents.
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16
            }}>
              {APPLICATION_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <article key={t.key} style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 20,
                    display: "flex", flexDirection: "column", gap: 8
                  }}>
                    <div style={{
                      width: 40, height: 40, display: "flex", alignItems: "center",
                      justifyContent: "center", color: COLORS.blue, background: "#edf3ff",
                      borderRadius: 10
                    }}>
                      <Icon />
                    </div>
                    <h3 style={{ margin: 0, fontSize: 15, color: COLORS.blue }}>{t.label}</h3>
                    <button onClick={() => openType(t)} style={{
                      marginTop: 8, padding: "10px", border: 0,
                      background: COLORS.blue, color: "#fff",
                      borderRadius: 6, fontWeight: 700, fontSize: 13,
                      cursor: "pointer", fontFamily: "inherit"
                    }}>Start</button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- My applications ---------------- */}
        {tab === "mine" && (
          <section>
            <h2 style={section.title}>My applications</h2>
            <p style={section.subtitle}>Track every pension application you've submitted.</p>
            <div style={{ display: "grid", gap: 14 }}>
              {applications.length === 0 && (
                <div style={{
                  padding: 40, textAlign: "center", background: "#fff",
                  border: `1px solid ${COLORS.border}`, borderRadius: 12,
                  color: COLORS.textMuted, fontSize: 13
                }}>You haven't submitted any pension applications yet.</div>
              )}
              {applications.map(a => {
                const canDelete = deletableStatuses.includes(a.status);
                const isDel = deletingId === a.application_id;
                return (
                  <article key={a.application_id} style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 18
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap"
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: COLORS.blue,
                        fontFamily: "Consolas, monospace"
                      }}>{a.reference_number}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>
                      {a.application_type.replace(/_/g, " ")}
                    </h3>
                    <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                      {a.programme_name} · Submitted {new Date(a.submitted_at).toLocaleDateString()}
                    </p>
                    {a.decision_summary && (
                      <p style={{
                        margin: "0 0 12px", padding: 10, background: COLORS.blueLight,
                        borderRadius: 6, fontSize: 12, color: COLORS.textMid
                      }}><strong>Officer note:</strong> {a.decision_summary}</p>
                    )}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={() => openDetail(a.application_id)} style={btnOutline}>
                        View details
                      </button>
                      <button
                        onClick={() => deleteApplication(a)}
                        disabled={!canDelete || isDel}
                        style={{
                          ...btnDanger,
                          opacity: (!canDelete || isDel) ? 0.5 : 1,
                          cursor: (!canDelete || isDel) ? "not-allowed" : "pointer"
                        }}
                      >
                        {isDel ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- Contributions ---------------- */}
        {tab === "contributions" && (
          <section>
            <h2 style={section.title}>My contributions</h2>
            <p style={section.subtitle}>Recorded member and employer contributions.</p>
            {contributions.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No contribution records.</p>
            )}
            {contributions.map(c => (
              <article key={c.contribution_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>
                      {new Date(c.contribution_period).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Member: M {Number(c.member_contribution).toFixed(2)} · Employer: M {Number(c.employer_contribution).toFixed(2)}
                    </p>
                  </div>
                  <StatusBadge status={c.reconciliation_status} />
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ---------------- Payments ---------------- */}
        {tab === "payments" && (
          <section>
            <h2 style={section.title}>My pension payments</h2>
            <p style={section.subtitle}>Pension payments scheduled, paid or in progress.</p>
            {payments.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No payments yet.</p>
            )}
            {payments.map(p => (
              <article key={p.payment_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>
                      M {Number(p.amount).toFixed(2)} · {p.payment_reference}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      {p.payment_period ? `Period: ${new Date(p.payment_period).toLocaleDateString()}` : ""}
                      {p.paid_at ? ` · Paid ${new Date(p.paid_at).toLocaleString()}` : ""}
                    </p>
                    {p.failure_reason && (
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: COLORS.error }}>
                        {p.failure_reason}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ---------------- Enquiries ---------------- */}
        {tab === "enquiries" && (
          <section>
            <h2 style={section.title}>Enquiries & complaints</h2>
            <p style={section.subtitle}>
              Report delayed payments, missing payments, incorrect deductions or other issues.
            </p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 24, marginBottom: 20
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                Submit a new enquiry
              </h3>
              <form onSubmit={submitEnquiry}>
                <label style={labelStyle}>Enquiry type</label>
                <select value={enquiryForm.enquiry_type}
                  onChange={e => setEnquiryForm(p => ({ ...p, enquiry_type: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  {ENQUIRY_TYPES.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>

                <label style={labelStyle}>Subject</label>
                <input required value={enquiryForm.subject}
                  onChange={e => setEnquiryForm(p => ({ ...p, subject: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Description</label>
                <textarea required rows={4} value={enquiryForm.description}
                  onChange={e => setEnquiryForm(p => ({ ...p, description: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                {enquiryMsg && (
                  <p style={{
                    color: enquiryMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{enquiryMsg}</p>
                )}
                <button type="submit" style={btnPrimary}>Submit</button>
              </form>
            </div>

            <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>
              My enquiries
            </h3>
            {enquiries.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No enquiries yet.</p>
            )}
            {enquiries.map(e => (
              <article key={e.enquiry_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{e.subject}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                      {e.reference_number} · {e.enquiry_type.replace(/_/g, " ")} · {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textMid }}>{e.description}</p>
                {e.response && (
                  <div style={{
                    margin: "10px 0 0", padding: 10,
                    background: COLORS.blueLight, borderRadius: 6,
                    fontSize: 12, color: COLORS.textMid
                  }}>
                    <strong>Response:</strong> {e.response}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {/* ---------------- Notifications ---------------- */}
        {tab === "notifications" && (
          <section>
            <h2 style={section.title}>Notifications</h2>
            <p style={section.subtitle}>Updates on your pension applications and payments.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {notifications.length === 0 && (
                <div style={{
                  padding: 40, textAlign: "center", background: "#fff",
                  border: `1px solid ${COLORS.border}`, borderRadius: 12,
                  color: COLORS.textMuted, fontSize: 13
                }}>No notifications yet.</div>
              )}
              {notifications.map(n => (
                <article key={n.notification_id} style={{
                  background: n.read_at ? "#fff" : COLORS.blueLight,
                  border: `1px solid ${n.read_at ? COLORS.border : COLORS.blue}`,
                  borderRadius: 10, padding: 16
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong style={{ fontSize: 13 }}>{n.subject}</strong>
                    <small style={{ color: COLORS.textMuted, fontSize: 11 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </small>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textMid }}>
                    {n.message}
                  </p>
                  {!n.read_at && (
                    <button onClick={() => markRead(n.notification_id)} style={{
                      marginTop: 8, border: 0, background: "transparent",
                      color: COLORS.blue, fontWeight: 700, fontSize: 12,
                      cursor: "pointer", padding: 0, fontFamily: "inherit"
                    }}>Mark as read</button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ---------------- Application form overlay ---------------- */}
      {activeType && (
        <Overlay onClose={closeType}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>{activeType.label}</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.textMuted }}>
            Fill in the details. The pension office will review your submission.
          </p>
          <form onSubmit={submitApplication}>
            <label style={labelStyle}>Reason / details</label>
            <textarea rows={4}
              value={details.reason || ""}
              onChange={e => setDetails(p => ({ ...p, reason: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Bank account (for payments, if applicable)</label>
            <input
              value={details.bank_account || ""}
              onChange={e => setDetails(p => ({ ...p, bank_account: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Bank name</label>
            <input
              value={details.bank_name || ""}
              onChange={e => setDetails(p => ({ ...p, bank_name: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Supporting documents</label>
            <input type="file" multiple
              onChange={e => setDocs(Array.from(e.target.files || []))}
              style={{ marginBottom: 14 }} />

            {submitError && (
              <p style={{
                color: COLORS.error, fontSize: 13, marginTop: 14,
                padding: 10, background: "#fdecea", borderRadius: 6
              }}>{submitError}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={closeType} style={btnOutline}>Cancel</button>
              <button type="submit" disabled={submitting} style={btnPrimary}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {/* ---------------- Application detail overlay ---------------- */}
      {selected && detail && (
        <Overlay onClose={() => { setSelected(null); setDetail(null); }}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {selected.reference_number}
          </h2>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.textMuted }}>
            {selected.application_type.replace(/_/g, " ")} · {selected.programme_name}
          </p>

          <Row label="Status" value={selected.status.replace(/_/g, " ")} />
          <Row label="Submitted" value={new Date(selected.submitted_at).toLocaleString()} />
          {selected.decision_summary && (
            <Row label="Officer note" value={selected.decision_summary} />
          )}
          {selected.decision_reference && (
            <Row label="Decision reference" value={selected.decision_reference} />
          )}

          {detail.documents?.length > 0 && (
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

          {detail.assessments?.length > 0 && (
            <>
              <h3 style={subHeading}>Benefit assessments</h3>
              {detail.assessments.map(a => (
                <Row key={a.assessment_id}
                  label={`M ${Number(a.gross_amount).toFixed(2)} · ${a.approval_status.replace(/_/g, " ")}`}
                  value={new Date(a.assessed_at).toLocaleDateString()} />
              ))}
            </>
          )}

          {detail.payments?.length > 0 && (
            <>
              <h3 style={subHeading}>Payments</h3>
              {detail.payments.map(p => (
                <Row key={p.payment_id}
                  label={`${p.payment_reference} · M ${Number(p.amount).toFixed(2)}`}
                  value={p.status} />
              ))}
            </>
          )}

          {detail.history?.length > 0 && (
            <>
              <h3 style={subHeading}>Status history</h3>
              {detail.history.map((h, i) => (
                <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                  <strong>{(h.new_status || "").replace(/_/g, " ")}</strong>{" "}
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

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button onClick={() => { setSelected(null); setDetail(null); }} style={btnPrimary}>
              Close
            </button>
          </div>
        </Overlay>
      )}
    </main>
  );
}

// ============================================================
function StatCard({ label, value, accent }) {
  return (
    <article style={{
      background: "#fff", border: `1px solid ${COLORS.border}`,
      borderLeft: `4px solid ${accent}`, borderRadius: 10,
      padding: "18px 22px"
    }}>
      <p style={{
        margin: "0 0 6px", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 0.6, color: COLORS.textMuted, fontWeight: 700
      }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: accent }}>{value}</p>
    </article>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "6px 0", borderBottom: `1px solid ${COLORS.borderLight}`,
      fontSize: 13, gap: 12
    }}>
      <span style={{ color: COLORS.textMuted, textTransform: "capitalize" }}>{label}</span>
      <span style={{ color: COLORS.textDark, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>
        {value}
      </span>
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
    RESOLVED:                   { bg: "#ecfdf3", fg: "#067647" }
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

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 28,
        maxWidth: 780, width: "100%", maxHeight: "90vh",
        overflowY: "auto", fontFamily: "Arial, sans-serif",
        boxShadow: "0 20px 60px rgba(0,32,159,0.25)"
      }}>{children}</div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 13, fontWeight: 600,
  marginBottom: 6, color: COLORS.textMid
};
const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: `1px solid ${COLORS.border}`, borderRadius: 6,
  fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box"
};
const btnPrimary = {
  padding: "10px 20px", border: 0, background: COLORS.blue,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 13, fontFamily: "inherit"
};
const btnOutline = {
  padding: "10px 20px", border: `1px solid ${COLORS.border}`,
  background: "#fff", color: COLORS.textMid, borderRadius: 6,
  cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit"
};
const btnDanger = {
  padding: "10px 20px", border: "1px solid #b3261e",
  background: "#fff", color: "#b3261e", borderRadius: 6,
  fontWeight: 700, fontSize: 13, fontFamily: "inherit"
};
const subHeading = {
  fontSize: 12, color: COLORS.textMuted,
  textTransform: "uppercase", marginTop: 18,
  marginBottom: 6, letterSpacing: 0.6, fontWeight: 700
};

export default PensionsDashboard;
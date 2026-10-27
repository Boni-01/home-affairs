import React, { useEffect, useState, useCallback } from "react";
import { COLORS, layout, header, cards, grids, section } from "../styles/dashboardStyles";
import Navbar from "../components/Navbar";
import OfficialDocuments, { OfficialFields } from "../components/OfficialRecord";
import arms from "../dashboards/arms.png";
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

function printNationalIdLetter(record) {
  const popup = window.open("", "national-id-issuance-letter", "width=850,height=1000");
  if (!popup) return alert("Allow pop-ups to print the issuance letter.");
  const safe = value => String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
  const sealUrl = new URL(arms, window.location.href).href;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>National ID issuance confirmation</title>
    <style>body{font-family:Georgia,'Times New Roman',serif;color:#243247;margin:48px auto;max-width:760px;line-height:1.65}header{display:flex;align-items:center;gap:18px;border-bottom:4px solid #123b75;padding-bottom:18px}img{width:74px;height:74px;object-fit:contain}.ministry{font:700 12px Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#123b75}h1{font-size:21px;margin:5px 0;color:#172b4d}.ref{margin:26px 0 18px;font:12px Arial,sans-serif;color:#526174}.fields{display:grid;grid-template-columns:1fr 1fr;border:1px solid #cbd5e1}.fields div{padding:12px;border-bottom:1px solid #e2e8f0}.label{font:10px Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px;color:#64748b}.value{font-weight:bold;margin-top:3px}.signature{margin-top:48px;display:flex;gap:70px;font:12px Arial,sans-serif}.signature div{border-top:1px solid #526174;min-width:220px;padding-top:7px}.foot{border-top:1px solid #cbd5e1;margin-top:34px;padding-top:12px;font:10px Arial,sans-serif;color:#64748b}@media print{body{margin:20mm auto}}</style></head><body>
    <header><img src="${safe(sealUrl)}" alt="Coat of arms"><div><div class="ministry">Kingdom of Lesotho</div><h1>National Identity and Civil Registry</h1><div>National ID issuance confirmation</div></div></header>
    <div class="ref"><b>Birth certificate reference:</b> ${safe(record.birth_certificate_reference)} &nbsp; · &nbsp; <b>Card control number:</b> ${safe(record.card_control_number)}</div>
    <p>This letter confirms that a National Identity Number has been allocated to the applicant below following review of the approved birth certificate and the recorded in-person identity capture.</p>
    <div class="fields">
      <div><div class="label">Full legal name</div><div class="value">${safe(record.full_name)}</div></div>
      <div><div class="label">National Identity Number</div><div class="value">${safe(record.national_id_number)}</div></div>
      <div><div class="label">Date of birth</div><div class="value">${safe(String(record.date_of_birth).slice(0,10))}</div></div>
      <div><div class="label">Sex / nationality</div><div class="value">${safe(record.sex)} / ${safe(record.nationality)}</div></div>
      <div><div class="label">Place of birth</div><div class="value">${safe(record.place_of_birth)}</div></div>
      <div><div class="label">Place of issue</div><div class="value">${safe(record.place_of_issue)}</div></div>
      <div><div class="label">Date issued</div><div class="value">${safe(String(record.issue_date).slice(0,10))}</div></div>
      <div><div class="label">Expiry date</div><div class="value">${safe(String(record.expiry_date || "").slice(0,10) || "—")}</div></div>
    </div>
    <div class="signature"><div>Issuing officer</div><div>Date</div></div>
    <div class="foot">${safe(record.issuing_authority)} · Administrative issuance confirmation · Retain with the verified application record.</div>
    </body></html>`);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 400);
}

const STATUS_FILTERS = [
  { key: "", label: "All statuses" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under review" },
  { key: "more_information_required", label: "Info required" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "payment_verified", label: "Payment verified" },
  { key: "approved", label: "Approved" },
  { key: "ready_for_collection", label: "Ready for collection" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" }
];

const TYPE_FILTERS = [
  { key: "", label: "All Home Affairs services" },
  { key: "NICR", label: "Civil Registration" },
  { key: "IMMIGRATION", label: "Immigration" },
  { key: "LRMIS", label: "Livestock" }
];

const NATIONAL_ID_EXTRA_FIELDS = [
  { key: "postal_address", label: "Postal address (if applicable)" },
  { key: "marital_status", label: "Marital status" },
  { key: "maiden_name", label: "Maiden name (if applicable)" },
  { key: "headman", label: "Village headman" },
  { key: "principal_chief", label: "Principal chief" },
  { key: "occupation", label: "Occupation" },
  { key: "workplace", label: "Workplace" },
  { key: "workplace_address", label: "Workplace address" },
  { key: "next_of_kin_name", label: "Next of kin" },
  { key: "next_of_kin_relation", label: "Next of kin relationship" },
  { key: "next_of_kin_address", label: "Next of kin address" },
  { key: "next_of_kin_phone", label: "Next of kin telephone" }
];

function HomeAffairsDashboardAdmin({ onLogout }) {
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [identityReviews, setIdentityReviews] = useState({ holds: [], birthDates: [] });
  const [nationalIds, setNationalIds] = useState([]);
  const [birthCertificates, setBirthCertificates] = useState([]);
  const [createdBirthCertificate, setCreatedBirthCertificate] = useState(null);
  const [creatingBirthCertificate, setCreatingBirthCertificate] = useState(false);
  const [birthCertificateError, setBirthCertificateError] = useState("");
  const [birthCertificateForm, setBirthCertificateForm] = useState({
    full_name: "", date_of_birth: "", sex: "", place_of_birth: "", parent_names: "",
    certificate_condition: "standard", email: "", phone: "", parent_one_id_verified: false,
    parent_two_id_verified: false, birth_notification_verified: false,
    immunization_card_verified: false, verification_notes: ""
  });
  const [issuedId, setIssuedId] = useState(null);
  const [issuingId, setIssuingId] = useState(false);
  const [nationalIdError, setNationalIdError] = useState("");
  const [nationalIdForm, setNationalIdForm] = useState({
    full_name: "", date_of_birth: "", sex: "", place_of_birth: "", nationality: "Mosotho",
    parent_names: "", residential_address: "", email: "", phone: "",
    postal_address: "", marital_status: "", maiden_name: "", headman: "", principal_chief: "",
    occupation: "", workplace: "", workplace_address: "", next_of_kin_name: "",
    next_of_kin_relation: "", next_of_kin_address: "", next_of_kin_phone: "",
    photo_captured: false, fingerprints_captured: false, signature_captured: false, capture_reference: "",
    birth_certificate_reference: "", issue_date: new Date().toISOString().slice(0, 10),
    place_of_issue: "Maseru", issuing_authority: "National Identity and Civil Registry", expiry_date: ""
  });

  const loadStats = useCallback(async () => {
    try {
      const data = await api("/admin/stats");
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  const loadIdentityReviews = useCallback(async () => {
    try {
      const data = await api("/admin/identity-reviews");
      setIdentityReviews({ holds: data.holds || [], birthDates: data.birthDates || [] });
    } catch (err) { console.error(err); }
  }, []);

  const loadNationalIds = useCallback(async () => {
    try {
      const data = await api("/admin/national-ids");
      setNationalIds(data.issuances || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadBirthCertificates = useCallback(async () => {
    try {
      const data = await api("/admin/birth-certificates");
      setBirthCertificates(data.certificates || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter) qs.set("module", typeFilter);
      const data = await api(`/admin/applications?${qs}`);
      setQueue(data.applications || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadIdentityReviews(); }, [loadIdentityReviews]);
  useEffect(() => { loadNationalIds(); }, [loadNationalIds]);
  useEffect(() => { loadBirthCertificates(); }, [loadBirthCertificates]);
  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function openApplication(id) {
    try {
      const data = await api(`/applications/${id}`);
      setSelected(data.application);
      setDetail(data);
      setNote("");
    } catch (err) { alert(err.message); }
  }

  async function setStatus(newStatus) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api(`/admin/applications/${selected.application_id}/status`, {
        method: "POST",
        body: JSON.stringify({ newStatus, note })
      });
      await openApplication(selected.application_id);
      await loadQueue();
      await loadStats();
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  }

  async function reviewDateOfBirth(userId, decision) {
    try {
      await api(`/admin/identity-reviews/${userId}/date-of-birth`, {
        method: "POST", body: JSON.stringify({ decision })
      });
      await loadIdentityReviews();
    } catch (err) { alert(err.message); }
  }

  async function clearIdentityHold(userId) {
    try {
      await api(`/admin/identity-reviews/${userId}/hold`, { method: "POST", body: JSON.stringify({}) });
      await loadIdentityReviews();
    } catch (err) { alert(err.message); }
  }

  async function issueNationalId(event) {
    event.preventDefault();
    setIssuingId(true);
    setNationalIdError("");
    setIssuedId(null);
    try {
      const data = await api("/admin/national-ids", {
        method: "POST", body: JSON.stringify(nationalIdForm)
      });
      setIssuedId(data.issuance);
      setNationalIdForm({ full_name: "", date_of_birth: "", sex: "", place_of_birth: "", nationality: "Mosotho",
        parent_names: "", residential_address: "", email: "", phone: "", birth_certificate_reference: "",
        postal_address: "", marital_status: "", maiden_name: "", headman: "", principal_chief: "", occupation: "",
        workplace: "", workplace_address: "", next_of_kin_name: "", next_of_kin_relation: "", next_of_kin_address: "",
        next_of_kin_phone: "", photo_captured: false, fingerprints_captured: false, signature_captured: false,
        capture_reference: "", issue_date: new Date().toISOString().slice(0, 10), place_of_issue: "Maseru",
        issuing_authority: "National Identity and Civil Registry", expiry_date: "" });
      await loadNationalIds();
    } catch (err) { setNationalIdError(err.message); }
    finally { setIssuingId(false); }
  }

  async function createBirthCertificateRecord(event) {
    event.preventDefault();
    setCreatingBirthCertificate(true);
    setBirthCertificateError("");
    setCreatedBirthCertificate(null);
    try {
      const data = await api("/admin/birth-certificates", {
        method: "POST", body: JSON.stringify(birthCertificateForm)
      });
      const certificate = data.certificate;
      setCreatedBirthCertificate(certificate);
      setBirthCertificates(current => [certificate, ...current]);
      setNationalIdForm(current => ({
        ...current, full_name: certificate.full_name, date_of_birth: String(certificate.date_of_birth).slice(0, 10),
        sex: certificate.sex, place_of_birth: certificate.place_of_birth, parent_names: certificate.parent_names || "",
        email: certificate.email, phone: certificate.phone || "", birth_certificate_reference: certificate.reference_number
      }));
      setBirthCertificateForm({ full_name: "", date_of_birth: "", sex: "", place_of_birth: "", parent_names: "",
        certificate_condition: "standard", email: "", phone: "", parent_one_id_verified: false,
        parent_two_id_verified: false, birth_notification_verified: false, immunization_card_verified: false,
        verification_notes: "" });
      await loadBirthCertificates();
    } catch (err) { setBirthCertificateError(err.message); }
    finally { setCreatingBirthCertificate(false); }
  }

  function prefillNationalIdFromBirthRecord() {
    if (!selected || !detail?.values) return;
    const values = Object.fromEntries(detail.values.map(value => [value.field_key, value.field_value]));
    const childName = [values.child_first_name, values.child_middle_name, values.child_last_name]
      .filter(Boolean).join(" ");
    setNationalIdForm(form => ({
      ...form,
      full_name: values.child_full_name || childName || selected.full_name || form.full_name,
      date_of_birth: String(values.child_dob || values.date_of_birth || "").slice(0, 10) || form.date_of_birth,
      sex: String(values.child_sex || values.sex || "").toLowerCase() || form.sex,
      place_of_birth: values.child_place_of_occurrence || values.child_place_of_birth || form.place_of_birth,
      parent_names: values.parent_names || form.parent_names,
      email: selected.email || form.email,
      phone: selected.phone || form.phone,
      birth_certificate_reference: selected.reference_number || form.birth_certificate_reference
    }));
  }

  const countFor = (key) =>
    stats.byStatus?.find(s => s.status === key)?.count || 0;

  return (
    <main className="dashboard-page" style={layout.page}>
      <Navbar items={[]} activeTab="" onLogout={onLogout} />
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={{
            ...header.content,
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 16, flexWrap: "wrap"
          }}>
            <div>
              <p style={header.eyebrow}>Ministry of Home Affairs</p>
              <h1 style={header.title}>Home Affairs Admin</h1>
              <p style={header.subtitle}>
                Review citizen applications across Home Affairs services
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

        {(identityReviews.holds.length > 0 || identityReviews.birthDates.length > 0) && (
          <section style={{ ...grids.twoCol, marginTop: 22 }}>
            {identityReviews.holds.length > 0 && <article style={cards.cardPadded}>
              <h2 style={section.title}>Lost or stolen ID reports</h2>
              <p style={section.subtitle}>These accounts are paused across all ministries until reviewed.</p>
              {identityReviews.holds.map(person => <div key={person.user_id} style={{ padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <strong>{person.full_name}</strong>
                <p style={{ margin: "4px 0", fontSize: 13, color: COLORS.textMuted }}>National ID: {person.national_id_number || "—"} · Ref: {person.identity_hold_reference || "—"}</p>
                <p style={{ margin: "4px 0 10px", fontSize: 13 }}>{person.identity_hold_reason}</p>
                <button type="button" onClick={() => clearIdentityHold(person.user_id)} style={actionButton}>Clear hold after review</button>
              </div>)}
            </article>}
            {identityReviews.birthDates.length > 0 && <article style={cards.cardPadded}>
              <h2 style={section.title}>Birth dates awaiting verification</h2>
              <p style={section.subtitle}>Only approved dates are used to calculate service eligibility.</p>
              {identityReviews.birthDates.map(person => <div key={person.user_id} style={{ padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <strong>{person.full_name}</strong>
                <p style={{ margin: "4px 0 10px", fontSize: 13, color: COLORS.textMuted }}>National ID: {person.national_id_number || "—"} · Date submitted: {String(person.pending_date_of_birth).slice(0, 10)}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => reviewDateOfBirth(person.user_id, "approve")} style={actionButton}>Verify date</button>
                  <button type="button" onClick={() => reviewDateOfBirth(person.user_id, "reject")} style={secondaryButton}>Reject</button>
                </div>
              </div>)}
            </article>}
          </section>
        )}

        <section style={grids.metrics}>
          <Metric label="Total applications" value={stats.totalApplications || 0} />
          <Metric label="Submitted" value={countFor("submitted")} />
          <Metric label="Approved" value={countFor("approved")} />
          <Metric label="Rejected" value={countFor("rejected")} />
        </section>

        <section style={{ ...grids.twoCol, gridTemplateColumns: "minmax(0,1.25fr) minmax(280px,.75fr)" }}>
          <article style={cards.cardPadded}>
            <h2 style={section.title}>Create a birth-certificate record</h2>
            <p style={section.subtitle}>Use this admin register after reviewing the original birth documents. It creates an approved Home Affairs reference and pre-fills the National ID form below. This also supports the first citizen account after the data reset.</p>
            <form onSubmit={createBirthCertificateRecord} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9 }}>
              <input required placeholder="Child full legal name" value={birthCertificateForm.full_name} onChange={e => setBirthCertificateForm(f => ({ ...f, full_name: e.target.value }))} style={inputStyle} />
              <input required type="date" aria-label="Child date of birth" value={birthCertificateForm.date_of_birth} onChange={e => setBirthCertificateForm(f => ({ ...f, date_of_birth: e.target.value }))} style={inputStyle} />
              <select required value={birthCertificateForm.sex} onChange={e => setBirthCertificateForm(f => ({ ...f, sex: e.target.value }))} style={inputStyle}>
                <option value="">Sex</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </select>
              <input required placeholder="Place of birth" value={birthCertificateForm.place_of_birth} onChange={e => setBirthCertificateForm(f => ({ ...f, place_of_birth: e.target.value }))} style={inputStyle} />
              <input placeholder="Parent or guardian names" value={birthCertificateForm.parent_names} onChange={e => setBirthCertificateForm(f => ({ ...f, parent_names: e.target.value }))} style={inputStyle} />
              <select value={birthCertificateForm.certificate_condition} onChange={e => setBirthCertificateForm(f => ({ ...f, certificate_condition: e.target.value }))} style={inputStyle}>
                <option value="standard">Standard copy</option><option value="damaged">Replacement for damaged certificate</option><option value="replacement">Replacement copy</option>
              </select>
              <input required type="email" placeholder="Citizen account email" value={birthCertificateForm.email} onChange={e => setBirthCertificateForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              <input placeholder="Phone for OTP sign-in" value={birthCertificateForm.phone} onChange={e => setBirthCertificateForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 7 }}>
                {[
                  ["parent_one_id_verified", "Parent / guardian one ID reviewed"],
                  ["parent_two_id_verified", "Parent / guardian two ID reviewed"],
                  ["birth_notification_verified", "Birth notification reviewed"],
                  ["immunization_card_verified", "Immunization card reviewed"]
                ].map(([key, label]) => <label key={key} style={captureLabel}><input type="checkbox" required checked={birthCertificateForm[key]} onChange={e => setBirthCertificateForm(f => ({ ...f, [key]: e.target.checked }))} /> {label}</label>)}
              </div>
              <textarea placeholder="Verification notes (optional)" rows={2} value={birthCertificateForm.verification_notes} onChange={e => setBirthCertificateForm(f => ({ ...f, verification_notes: e.target.value }))} style={{ ...inputStyle, gridColumn: "1 / -1", resize: "vertical" }} />
              <button type="submit" disabled={creatingBirthCertificate} style={{ ...actionButton, gridColumn: "1 / -1", padding: "11px 16px" }}>{creatingBirthCertificate ? "Saving record…" : "Approve record and generate reference"}</button>
            </form>
            {birthCertificateError && <p role="alert" style={{ color: COLORS.error, fontSize: 13 }}>{birthCertificateError}</p>}
            {createdBirthCertificate && <div className="home-affairs-created-birth-certificate" role="status" style={{ marginTop: 12, padding: 14, background: "#ecfdf3", border: "1px solid #86efac", borderRadius: 8 }}>
              <strong style={{ color: "#067647" }}>Approved birth-certificate record created</strong>
              <div style={{ marginTop: 5, color: COLORS.blue, fontSize: 21, fontWeight: 800, letterSpacing: 1 }}>{createdBirthCertificate.reference_number}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: COLORS.textMid }}>The reference has been copied into the National ID form below. Review the remaining particulars and issue the ID when eligible.</div>
            </div>}
          </article>
          <article className="home-affairs-birth-certificate-references" style={cards.cardPadded}>
            <h2 style={section.title}>Recent birth-certificate references</h2>
            {birthCertificates.length === 0 ? <p style={section.subtitle}>No admin-created birth-certificate records yet.</p> : birthCertificates.slice(0, 8).map(certificate => <div key={certificate.birth_certificate_id} style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <strong className="home-affairs-birth-certificate-reference-number" style={{ color: COLORS.blue }}>{certificate.reference_number}</strong>
              <div style={{ marginTop: 3, fontSize: 12, color: COLORS.textDark }}>{certificate.full_name}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: COLORS.textMuted }}>{String(certificate.date_of_birth).slice(0, 10)} · {certificate.record_status}</div>
            </div>)}
          </article>
        </section>

        <section style={{ ...grids.twoCol, gridTemplateColumns: "minmax(0,1.25fr) minmax(280px,.75fr)" }}>
          <article style={cards.cardPadded}>
            <h2 style={section.title}>Issue a National ID from a birth record</h2>
            <p style={section.subtitle}>Complete the identity register from the approved birth certificate and capture the account email. A unique 12-digit ID starting with 10 is issued once and then linked to the citizen account at registration.</p>
            {selected?.module === "NICR" && selected?.status === "approved" && /birth/i.test(`${selected.service_type || ""} ${detail?.extra?.request_type || ""}`) &&
              <button type="button" onClick={prefillNationalIdFromBirthRecord} style={{ ...secondaryButton, marginBottom: 12 }}>Fill from selected approved birth certificate</button>}
            <form onSubmit={issueNationalId} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
              <input required placeholder="Full legal name" value={nationalIdForm.full_name} onChange={e => setNationalIdForm(f => ({ ...f, full_name: e.target.value }))} style={inputStyle} />
              <input required type="date" aria-label="Date of birth" value={nationalIdForm.date_of_birth} onChange={e => setNationalIdForm(f => ({ ...f, date_of_birth: e.target.value }))} style={inputStyle} />
              <select required value={nationalIdForm.sex} onChange={e => setNationalIdForm(f => ({ ...f, sex: e.target.value }))} style={inputStyle}>
                <option value="">Sex</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </select>
              <input required placeholder="Place of birth" value={nationalIdForm.place_of_birth} onChange={e => setNationalIdForm(f => ({ ...f, place_of_birth: e.target.value }))} style={inputStyle} />
              <input placeholder="Nationality" value={nationalIdForm.nationality} onChange={e => setNationalIdForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle} />
              <input placeholder="Parent or guardian names" value={nationalIdForm.parent_names} onChange={e => setNationalIdForm(f => ({ ...f, parent_names: e.target.value }))} style={inputStyle} />
              <input required type="email" placeholder="Citizen account email" value={nationalIdForm.email} onChange={e => setNationalIdForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              <input placeholder="Phone for OTP sign-in" value={nationalIdForm.phone} onChange={e => setNationalIdForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              <input required placeholder="Residential address (used by connected ministries)" value={nationalIdForm.residential_address} onChange={e => setNationalIdForm(f => ({ ...f, residential_address: e.target.value }))} style={inputStyle} />
              {NATIONAL_ID_EXTRA_FIELDS.map(field => <input key={field.key} placeholder={field.label}
                value={nationalIdForm[field.key]} onChange={e => setNationalIdForm(f => ({ ...f, [field.key]: e.target.value }))} style={inputStyle} />)}
              <input required placeholder="Birth certificate reference" value={nationalIdForm.birth_certificate_reference} onChange={e => setNationalIdForm(f => ({ ...f, birth_certificate_reference: e.target.value }))} style={inputStyle} />
              <label style={captureLabel}><input type="checkbox" required checked={nationalIdForm.photo_captured} onChange={e => setNationalIdForm(f => ({ ...f, photo_captured: e.target.checked }))} /> Officer confirms the applicant's photo was captured in person</label>
              <label style={captureLabel}><input type="checkbox" required checked={nationalIdForm.fingerprints_captured} onChange={e => setNationalIdForm(f => ({ ...f, fingerprints_captured: e.target.checked }))} /> Officer confirms all required fingerprints were captured in person</label>
              <label style={captureLabel}><input type="checkbox" required checked={nationalIdForm.signature_captured} onChange={e => setNationalIdForm(f => ({ ...f, signature_captured: e.target.checked }))} /> Signature or thumbprint was recorded</label>
              <input required placeholder="Biometric capture / appointment reference" value={nationalIdForm.capture_reference} onChange={e => setNationalIdForm(f => ({ ...f, capture_reference: e.target.value }))} style={inputStyle} />
              <label style={dateInputLabel}>Issue date<input required type="date" value={nationalIdForm.issue_date} onChange={e => setNationalIdForm(f => ({ ...f, issue_date: e.target.value }))} style={inputStyle} /></label>
              <input required placeholder="Place of issue" value={nationalIdForm.place_of_issue} onChange={e => setNationalIdForm(f => ({ ...f, place_of_issue: e.target.value }))} style={inputStyle} />
              <input required placeholder="Issuing authority" value={nationalIdForm.issuing_authority} onChange={e => setNationalIdForm(f => ({ ...f, issuing_authority: e.target.value }))} style={inputStyle} />
              <label style={dateInputLabel}>Expiry date (if applicable)<input type="date" value={nationalIdForm.expiry_date} onChange={e => setNationalIdForm(f => ({ ...f, expiry_date: e.target.value }))} style={inputStyle} /></label>
              <button type="submit" disabled={issuingId} style={{ ...actionButton, gridColumn: "1 / -1", padding: "11px 16px", cursor: issuingId ? "wait" : "pointer" }}>{issuingId ? "Issuing…" : "Issue National ID"}</button>
            </form>
            {nationalIdError && <p role="alert" style={{ color: COLORS.error, fontSize: 13 }}>{nationalIdError}</p>}
            {issuedId && <div role="status" style={{ marginTop: 12, padding: 14, borderRadius: 8, background: "#ecfdf3", border: "1px solid #86efac" }}>
              <strong style={{ color: "#067647" }}>National ID issued</strong>
              <div style={{ marginTop: 5, fontSize: 21, fontWeight: 800, letterSpacing: 2, color: COLORS.blue }}>{issuedId.national_id_number}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: COLORS.textMid }}>Account email: {issuedId.email} · Reference: {issuedId.birth_certificate_reference}</div>
              <button type="button" onClick={() => printNationalIdLetter(issuedId)} style={{ ...actionButton, marginTop: 10 }}>Print issuance letter</button>
              <article style={{ marginTop: 14, padding: 18, background: "#fff", border: "1px solid #cbd5e1", maxWidth: 620 }}>
                <header style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "3px solid #123b75", paddingBottom: 12 }}>
                  <img src={arms} alt="Kingdom of Lesotho coat of arms" style={{ width: 52, height: 52, objectFit: "contain" }} />
                  <div><div style={{ color: "#123b75", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Kingdom of Lesotho</div>
                    <div style={{ color: COLORS.textDark, fontWeight: 700, marginTop: 3 }}>National Identity and Civil Registry</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 3 }}>National ID issuance confirmation</div></div>
                </header>
                <p style={{ margin: "16px 0 8px", fontFamily: "Georgia,serif", fontSize: 13, lineHeight: 1.7 }}>This record confirms the National Identity Number allocated to the applicant below against the approved birth certificate reference shown.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, padding: "10px 0" }}>
                  <span><strong>Applicant</strong><br />{issuedId.full_name}</span><span><strong>National ID number</strong><br /><b style={{ color: COLORS.blue, letterSpacing: 1 }}>{issuedId.national_id_number}</b></span>
                  <span><strong>Date of birth</strong><br />{String(issuedId.date_of_birth).slice(0, 10)}</span><span><strong>Birth certificate reference</strong><br />{issuedId.birth_certificate_reference}</span>
                  <span><strong>Issue date</strong><br />{String(issuedId.issue_date).slice(0, 10)}</span><span><strong>Expiry date</strong><br />{String(issuedId.expiry_date || "").slice(0, 10) || "—"}</span>
                  <span><strong>Place of issue</strong><br />{issuedId.place_of_issue}</span><span><strong>Card control number</strong><br />{issuedId.card_control_number}</span>
                </div>
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 10, marginTop: 8, fontSize: 10, color: COLORS.textMuted }}>Administrative confirmation · retain with the verified application record</div>
              </article>
            </div>}
          </article>
          <article style={cards.cardPadded}>
            <h2 style={section.title}>Recent National ID issuances</h2>
            {nationalIds.length === 0 ? <p style={section.subtitle}>No IDs issued yet.</p> : nationalIds.slice(0, 8).map(item => <div key={item.issuance_id} style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <strong style={{ color: COLORS.blue, letterSpacing: 1 }}>{item.national_id_number}</strong>
              <div style={{ marginTop: 3, fontSize: 12, color: COLORS.textDark }}>{item.full_name}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: COLORS.textMuted }}>{item.email} · {item.issuance_status.replace(/_/g, " ")}</div>
            </div>)}
          </article>
        </section>

        <section style={grids.twoCol}>
            <article style={cards.cardPadded}>
              <h2 style={section.title}>Queue</h2>
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
                    {queue.length === 0 && !loading && (
                      <tr><td colSpan={5} style={{
                        padding: 16, color: COLORS.textMuted, fontSize: 13
                      }}>No applications.</td></tr>
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
                        <td style={tdStyle}>{a.service_type} <small>({a.module})</small></td>
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
                        {selected.service_type} · {selected.module}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <div style={{
                    display: "flex", gap: 16, padding: 14, marginBottom: 14,
                    background: COLORS.lightBg, borderRadius: 10,
                    border: `1px solid ${COLORS.borderLight}`
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
                        <span style={{ fontSize: 10, color: COLORS.textMuted, padding: 6 }}>
                          No photo
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: "0 0 6px", fontSize: 14,
                        fontWeight: 700, color: COLORS.textDark
                      }}>{selected.full_name}</p>
                      <Row label="National ID" value={selected.national_id || "—"} />
                      <Row label="Email" value={selected.email || "—"} />
                      <Row label="Phone" value={selected.phone || "—"} />
                    </div>
                  </div>

                  <OfficialFields values={detail?.values || []} />
                  <OfficialDocuments documents={detail?.documents || []}
                    baseUrl={API_BASE.replace("/api", "")} />

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
                      ["approved", "Approve", COLORS.green],
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

                </>
              )}
            </aside>
          </section>
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
    <span className="admin-status-badge" style={{
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

const actionButton = {
  padding: "8px 12px", border: 0, borderRadius: 6,
  background: COLORS.blue, color: "#fff", cursor: "pointer",
  fontWeight: 700, fontSize: 12
};

const secondaryButton = {
  padding: "8px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 6,
  background: "#fff", color: COLORS.textDark, cursor: "pointer",
  fontWeight: 700, fontSize: 12
};

const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: `1px solid ${COLORS.border}`, borderRadius: 6,
  fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box"
};

const dateInputLabel = {
  display: "grid", gap: 5, color: COLORS.textMuted, fontSize: 11,
  fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4
};

const captureLabel = {
  display: "flex", alignItems: "flex-start", gap: 8, padding: 9, borderRadius: 6,
  border: `1px solid ${COLORS.borderLight}`, color: COLORS.textMid, fontSize: 12, lineHeight: 1.4
};

const btnSmall = {
  padding: "8px 14px", border: 0, background: COLORS.blue,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
};

const checkboxLabel = {
  display: "block", fontSize: 13, color: COLORS.textMid, marginBottom: 4
};

export default HomeAffairsDashboardAdmin;

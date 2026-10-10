import React, { useEffect, useState, useCallback, useRef } from "react";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import { auth, API_BASE } from "../Database/firebase";
import jsPDF from "jspdf";

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
// Application types (categories the citizen can start)
// ============================================================
const APPLICATION_TYPES = [
  { key: "crime_report",            label: "Report a crime",                       description: "Report theft, assault, burglary, fraud, or any other criminal incident.", categoryCode: "CRIME",           icon: "🚨" },
  { key: "theft_report",            label: "Report theft",                         description: "Report stolen property, livestock, or other possessions.",                categoryCode: "THEFT",           icon: "🕵️" },
  { key: "lost_item_report",        label: "Report a lost item",                   description: "Report lost identity documents, phones, or other property.",              categoryCode: "LOST_ITEM",       icon: "🔎" },
  { key: "missing_person_report",   label: "Report a missing person",              description: "Submit information about a missing person.",                              categoryCode: "MISSING_PERSON",  icon: "🧭" },
  { key: "fraud_report",            label: "Report fraud or cybercrime",           description: "Report suspected fraud, scams, or online crime.",                         categoryCode: "FRAUD_CYBER",     icon: "💻" },
  { key: "traffic_incident",        label: "Report a road traffic incident",       description: "Submit information about a traffic accident or road incident.",           categoryCode: "TRAFFIC",         icon: "🚗" },
  { key: "police_clearance",        label: "Request a police clearance certificate", description: "Apply for a clearance certificate, subject to eligibility checks.",       categoryCode: "CLEARANCE",       icon: "🪪" },
  { key: "police_report_request",   label: "Request a police report",              description: "Request an eligible copy or confirmation of a police report.",            categoryCode: "POLICE_REPORT",   icon: "📄" },
  { key: "police_conduct_complaint",label: "Complaint against police conduct",     description: "Report alleged misconduct or dissatisfaction with police service.",       categoryCode: "COMPLAINT",       icon: "⚖️" },
  { key: "witness_information",     label: "Submit witness information",           description: "Provide details of an incident or potential witnesses.",                  categoryCode: "WITNESS",         icon: "🙋" },
  { key: "additional_evidence",     label: "Provide additional evidence",          description: "Upload documents, photographs, or other relevant information.",           categoryCode: "EVIDENCE",        icon: "📎" }
];

const FIELDS_BY_TYPE = {
  crime_report: [
    { key: "incident_date",     label: "When did it happen?",               type: "datetime-local" },
    { key: "incident_location", label: "Where did it happen?",              type: "text" },
    { key: "district",          label: "District",                          type: "text" },
    { key: "village_or_area",   label: "Village / area",                    type: "text" },
    { key: "suspect_details",   label: "Suspect details (if known)",        type: "textarea" }
  ],
  theft_report: [
    { key: "incident_date",     label: "When did the theft occur?",         type: "datetime-local" },
    { key: "incident_location", label: "Where did it occur?",               type: "text" },
    { key: "items_stolen",      label: "What was stolen?",                  type: "textarea" },
    { key: "estimated_value",   label: "Estimated value (LSL)",             type: "number" }
  ],
  lost_item_report: [
    { key: "incident_date",     label: "When was it lost?",                 type: "datetime-local" },
    { key: "incident_location", label: "Where was it lost?",                type: "text" },
    { key: "items_lost",        label: "What was lost?",                    type: "textarea" }
  ],
  missing_person_report: [
    { key: "missing_person_name",  label: "Missing person's full name",     type: "text" },
    { key: "missing_person_age",   label: "Approximate age",                type: "number" },
    { key: "last_seen_date",       label: "Last seen date",                 type: "datetime-local" },
    { key: "last_seen_location",   label: "Last seen location",             type: "text" },
    { key: "identifying_details",  label: "Physical / identifying details", type: "textarea" }
  ],
  fraud_report: [
    { key: "incident_date",     label: "When did it happen?",               type: "datetime-local" },
    { key: "platform",          label: "Platform / channel (email, phone, etc.)", type: "text" },
    { key: "loss_amount",       label: "Amount lost (LSL)",                 type: "number" }
  ],
  traffic_incident: [
    { key: "incident_date",     label: "Incident date and time",            type: "datetime-local" },
    { key: "incident_location", label: "Location",                          type: "text" },
    { key: "vehicles_involved", label: "Vehicles involved",                 type: "textarea" },
    { key: "injuries",          label: "Injuries (yes/no + details)",       type: "text" }
  ],
  police_clearance: [
    { key: "national_id_used",      label: "National ID number",            type: "text" },
    { key: "date_of_birth",         label: "Date of birth",                 type: "date" },
    { key: "purpose",               label: "Purpose of clearance",          type: "text" },
    { key: "destination_country",   label: "Destination country (if any)",  type: "text" }
  ],
  police_report_request: [
    { key: "related_reference", label: "Related report reference number",   type: "text" },
    { key: "purpose",           label: "Purpose of request",                type: "textarea" }
  ],
  police_conduct_complaint: [
    { key: "officer_details",   label: "Officer name / badge (if known)",   type: "text" },
    { key: "incident_date",     label: "When did it happen?",               type: "datetime-local" },
    { key: "incident_location", label: "Where did it happen?",              type: "text" }
  ],
  witness_information: [
    { key: "related_reference", label: "Related report reference number",   type: "text" },
    { key: "witness_name",      label: "Witness name",                      type: "text" },
    { key: "witness_phone",     label: "Witness phone",                     type: "text" },
    { key: "statement",         label: "Witness statement",                 type: "textarea" }
  ],
  additional_evidence: [
    { key: "related_reference", label: "Related report reference number",   type: "text" },
    { key: "evidence_notes",    label: "Description of evidence",           type: "textarea" }
  ]
};

function PoliceDashboard() {
  const [tab, setTab] = useState("report");
  const [me, setMe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedback, setFeedback] = useState([]);

  // Application form
  const [activeType, setActiveType] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", urgency: "normal" });
  const [fields, setFields] = useState({});
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Detail view
  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState(null);

  // Feedback
  const [feedbackForm, setFeedbackForm] = useState({ application_id: "", rating: 5, comments: "" });
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  // Letters
  const [letterTemplates, setLetterTemplates] = useState([]);
  const [letters, setLetters] = useState([]);
  const [letterForm, setLetterForm] = useState({
    letter_type: "",
    application_id: "",
    items: "",
    statement: ""
  });
  const [letterMsg, setLetterMsg] = useState("");
  const [letterPreview, setLetterPreview] = useState(null);

  // Certified documents
  const [certDocs, setCertDocs] = useState([]);
  const [certNotifications, setCertNotifications] = useState([]);
  const [certForm, setCertForm] = useState({ document_title: "", purpose: "", notes: "" });
  const [certFile, setCertFile] = useState(null);
  const [certMsg, setCertMsg] = useState("");
  const [certDetail, setCertDetail] = useState(null);

  const certFileRef = useRef(null);

  // ---------------- LOAD ----------------
  const load = useCallback(async () => {
    try {
      const [
        meRes, catRes, appsRes, notifRes, fbRes,
        tplRes, letRes, cdRes, cdNotifRes
      ] = await Promise.all([
        api("/me"),
        api("/police/categories"),
        api("/police/applications/my"),
        api("/police/notifications"),
        api("/police/feedback/my"),
        api("/police/letter-templates"),
        api("/police/letters/my"),
        api("/police/certified-documents/my"),
        api("/police/certified-documents-notifications")
      ]);
      setMe(meRes.user);
      setCategories(catRes.categories || []);
      setApplications(appsRes.applications || []);
      setNotifications(notifRes.notifications || []);
      setFeedback(fbRes.feedback || []);
      setLetterTemplates(tplRes.templates || []);
      setLetters(letRes.letters || []);
      setCertDocs(cdRes.documents || []);
      setCertNotifications(cdNotifRes.notifications || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---------------- APPLICATION FORM ----------------
  function openType(type) {
    setActiveType(type);
    setForm({ title: "", description: "", urgency: "normal" });
    setFields({});
    setEvidence([]);
    setSubmitError("");
  }

  function closeType() {
    setActiveType(null);
    setFields({});
    setEvidence([]);
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const cat = categories.find(c => c.category_code === activeType.categoryCode);
      const fd = new FormData();
      fd.append("applicationType", activeType.key);
      if (cat) fd.append("categoryId", cat.category_id);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("fields", JSON.stringify({ ...fields, urgency: form.urgency }));
      for (const f of evidence) {
        if (f instanceof File) fd.append("evidence", f, f.name);
      }
      const res = await api("/police/applications", { method: "POST", body: fd });
      closeType();
      await load();
      alert(`Submitted. Reference: ${res.referenceNumber}`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------- DETAIL / DELETE ----------------
  async function openDetail(id) {
    try {
      const data = await api(`/police/applications/${id}`);
      setSelected(data.application);
      setDetail(data);
    } catch (err) { alert(err.message); }
  }

  async function deleteApplication(app) {
    if (!window.confirm(`Delete report ${app.reference_number}? This cannot be undone.`)) return;
    setDeletingId(app.application_id);
    try {
      await api(`/police/applications/${app.application_id}`, { method: "DELETE" });
      if (selected?.application_id === app.application_id) {
        setSelected(null); setDetail(null);
      }
      await load();
    } catch (err) {
      alert("Could not delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // ---------------- NOTIFICATIONS ----------------
  async function markRead(id) {
    try {
      await api(`/police/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev =>
        prev.map(n => n.notification_id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (err) { console.error(err); }
  }

  // ---------------- FEEDBACK ----------------
  async function submitFeedback(e) {
    e.preventDefault();
    setFeedbackMsg("");
    try {
      await api("/police/feedback", {
        method: "POST",
        body: JSON.stringify(feedbackForm)
      });
      setFeedbackMsg("Thank you — feedback received.");
      setFeedbackForm({ application_id: "", rating: 5, comments: "" });
      const fbRes = await api("/police/feedback/my");
      setFeedback(fbRes.feedback || []);
    } catch (err) {
      setFeedbackMsg("Error: " + err.message);
    }
  }

  // ---------------- LETTERS ----------------
  async function issueLetter(e) {
    e.preventDefault();
    setLetterMsg("");
    if (!letterForm.letter_type) {
      setLetterMsg("Please select a letter type.");
      return;
    }
    try {
      const res = await api("/police/letters", {
        method: "POST",
        body: JSON.stringify(letterForm)
      });
      setLetterMsg(`Letter issued: ${res.reference}`);
      setLetterPreview(res);
      setLetterForm({ letter_type: "", application_id: "", items: "", statement: "" });
      const lets = await api("/police/letters/my");
      setLetters(lets.letters || []);
    } catch (err) {
      setLetterMsg("Error: " + err.message);
    }
  }

  async function openLetter(id) {
    try {
      const data = await api(`/police/letters/${id}`);
      setLetterPreview(data.letter);
    } catch (err) { alert(err.message); }
  }

  function downloadLetterPdf(letter) {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 56;
      const width = 595 - margin * 2;
      const lines = doc.splitTextToSize(letter.body || "", width);
      let y = margin;

      doc.setFont("times", "bold").setFontSize(12);
      doc.text("KINGDOM OF LESOTHO", margin, y); y += 16;
      doc.setFontSize(11);
      doc.text("LESOTHO MOUNTED POLICE SERVICE", margin, y); y += 24;

      doc.setFont("times", "normal").setFontSize(11);
      for (const line of lines) {
        if (y > 780) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      }

      doc.setFontSize(9).setTextColor(120);
      doc.text(
        `Generated on ${new Date().toLocaleString("en-LS")} · ${letter.reference_number || ""}`,
        margin,
        800
      );

      doc.save(`${letter.reference_number || "letter"}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Could not generate PDF.");
    }
  }

  // ---------------- CERTIFIED DOCUMENTS ----------------
  async function submitCertifiedDoc(e) {
    e.preventDefault();
    setCertMsg("");
    if (!certFile) {
      setCertMsg("Please attach the document you want certified.");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("document_title", certForm.document_title);
      fd.append("purpose", certForm.purpose);
      fd.append("notes", certForm.notes);
      fd.append("document", certFile);
      const res = await api("/police/certified-documents", {
        method: "POST",
        body: fd
      });
      setCertMsg(`Submitted. Reference: ${res.reference}`);
      setCertForm({ document_title: "", purpose: "", notes: "" });
      setCertFile(null);
      if (certFileRef.current) certFileRef.current.value = "";
      const cd = await api("/police/certified-documents/my");
      setCertDocs(cd.documents || []);
    } catch (err) {
      setCertMsg("Error: " + err.message);
    }
  }

  async function openCertDoc(id) {
    try {
      const data = await api(`/police/certified-documents/${id}`);
      setCertDetail(data);
    } catch (err) { alert(err.message); }
  }

  async function downloadCertified(certifiedDocId) {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const url = `${API_BASE}/police/certified-documents/${certifiedDocId}/download`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^"]+)"?/.exec(cd);
      const filename = match ? match[1] : "certified_document";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert("Could not download: " + err.message);
    }
  }

  async function markCertNotifRead(id) {
    try {
      await api(`/police/certified-documents-notifications/${id}/read`, { method: "POST" });
      setCertNotifications(prev =>
        prev.map(n => n.notification_id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (err) { console.error(err); }
  }

  // Counters
  const unread = notifications.filter(n => !n.read_at).length;
  const unreadCertNotifs = certNotifications.filter(n => !n.read_at).length;
  const deletableStatuses = ["submitted", "received", "more_information_required"];

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={header.content}>
            <p style={header.eyebrow}>Lesotho Mounted Police Service</p>
            <h1 style={header.title}>Police Services</h1>
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

        {/* Emergency banner */}
        <aside style={{
          display: "flex", gap: 12, alignItems: "flex-start",
          marginBottom: 24, padding: "14px 18px",
          background: "#fff9e9", border: "1px solid #f0d28b",
          borderRadius: 12, color: "#654b12", fontSize: 13, lineHeight: 1.5
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>
            <strong style={{ color: "#92400e" }}>Immediate danger?</strong>{" "}
            Call your local emergency number. This portal is not an emergency reporting channel.
          </span>
        </aside>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16, marginBottom: 28
        }}>
          <StatCard label="My reports" value={applications.length} accent={COLORS.blue} />
          <StatCard label="Letters issued" value={letters.length} accent={COLORS.blue} />
          <StatCard label="Certifications" value={certDocs.length} accent={COLORS.green} />
          <StatCard label="Notifications" value={unread + unreadCertNotifs} accent={COLORS.blue} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["report", "Report / Apply"],
            ["mine", `My reports (${applications.length})`],
            ["letters", `Letters (${letters.length})`],
            ["certify", `Certify document (${certDocs.length})`],
            ["notifications", `Notifications${unread ? ` (${unread})` : ""}`],
            ["feedback", "Feedback"]
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

        {/* ================= REPORT TAB ================= */}
        {tab === "report" && (
          <section style={section.wrapper}>
            <h2 style={section.title}>What would you like to do?</h2>
            <p style={section.subtitle}>
              Choose a service. You'll be asked for the details we need to process it.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16
            }}>
              {APPLICATION_TYPES.map(t => (
                <article key={t.key} style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 20,
                  boxShadow: "0 2px 8px rgba(0,32,159,0.05)",
                  display: "flex", flexDirection: "column", gap: 8
                }}>
                  <span style={{ fontSize: 24 }}>{t.icon}</span>
                  <h3 style={{ margin: 0, fontSize: 15, color: COLORS.blue }}>{t.label}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, flexGrow: 1 }}>
                    {t.description}
                  </p>
                  <button onClick={() => openType(t)} style={{
                    width: "100%", padding: "10px", border: 0,
                    background: COLORS.blue, color: "#fff",
                    borderRadius: 6, fontWeight: 700, fontSize: 13,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>Start</button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ================= MY REPORTS TAB ================= */}
        {tab === "mine" && (
          <section>
            <h2 style={section.title}>My reports</h2>
            <p style={section.subtitle}>Track every report or request you've submitted.</p>

            <div style={{ display: "grid", gap: 14 }}>
              {applications.length === 0 && (
                <div style={{
                  padding: 40, textAlign: "center", background: "#fff",
                  border: `1px solid ${COLORS.border}`, borderRadius: 12,
                  color: COLORS.textMuted, fontSize: 13
                }}>You have not submitted any reports yet.</div>
              )}
              {applications.map(a => {
                const canDelete = deletableStatuses.includes(a.status);
                const isDeleting = deletingId === a.application_id;
                return (
                  <article key={a.application_id} style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 18,
                    boxShadow: "0 2px 8px rgba(0,32,159,0.05)"
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
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, color: COLORS.textDark }}>
                      {a.title}
                    </h3>
                    <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                      {a.category_name} · {a.application_type.replace(/_/g, " ")}
                      {" · Urgency: "}<strong>{a.urgency}</strong>
                      {" · Submitted "}{new Date(a.submitted_at).toLocaleDateString()}
                    </p>
                    {a.admin_notes && (
                      <p style={{
                        margin: "0 0 12px", padding: 10, background: COLORS.blueLight,
                        borderRadius: 6, fontSize: 12, color: COLORS.textMid, lineHeight: 1.5
                      }}><strong>Officer note:</strong> {a.admin_notes}</p>
                    )}
                    {a.rejection_reason && (
                      <p style={{
                        margin: "0 0 12px", padding: 10, background: "#fdecea",
                        borderRadius: 6, fontSize: 12, color: "#b3261e", lineHeight: 1.5
                      }}><strong>Rejection reason:</strong> {a.rejection_reason}</p>
                    )}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={() => openDetail(a.application_id)} style={btnOutline}>
                        View details
                      </button>
                      <button onClick={() => deleteApplication(a)}
                        disabled={!canDelete || isDeleting}
                        title={!canDelete ? `Cannot delete — status is "${a.status.replace(/_/g, " ")}"` : ""}
                        style={{
                          ...btnDanger,
                          opacity: (!canDelete || isDeleting) ? 0.5 : 1,
                          cursor: (!canDelete || isDeleting) ? "not-allowed" : "pointer"
                        }}>
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= LETTERS TAB ================= */}
        {tab === "letters" && (
          <section>
            <h2 style={section.title}>Police letters</h2>
            <p style={section.subtitle}>
              Generate official letters from templates. You can download any letter as a PDF.
            </p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 24, marginBottom: 20
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                Generate a new letter
              </h3>
              <form onSubmit={issueLetter}>
                <label style={labelStyle}>Letter type</label>
                <select required
                  value={letterForm.letter_type}
                  onChange={e => setLetterForm(p => ({ ...p, letter_type: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="">Select…</option>
                  {letterTemplates.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>

                <label style={labelStyle}>Related report (optional)</label>
                <select value={letterForm.application_id}
                  onChange={e => setLetterForm(p => ({ ...p, application_id: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="">— None —</option>
                  {applications.map(a => (
                    <option key={a.application_id} value={a.application_id}>
                      {a.reference_number} · {a.title}
                    </option>
                  ))}
                </select>

                {letterForm.letter_type === "loss_report" && (
                  <>
                    <label style={labelStyle}>Items lost / stolen</label>
                    <textarea rows={3}
                      value={letterForm.items}
                      onChange={e => setLetterForm(p => ({ ...p, items: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 14 }} />
                  </>
                )}

                {(letterForm.letter_type === "affidavit" ||
                  letterForm.letter_type === "witness_statement" ||
                  letterForm.letter_type === "general_letter") && (
                  <>
                    <label style={labelStyle}>Statement / body text</label>
                    <textarea rows={5}
                      value={letterForm.statement}
                      onChange={e => setLetterForm(p => ({ ...p, statement: e.target.value }))}
                      style={{ ...inputStyle, marginBottom: 14 }} />
                  </>
                )}

                {letterMsg && (
                  <p style={{
                    color: letterMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{letterMsg}</p>
                )}
                <button type="submit" style={btnPrimary}>Generate letter</button>
              </form>
            </div>

            {letterPreview && (
              <div style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: 24, marginBottom: 20
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 14, color: COLORS.blue }}>
                    Letter preview
                  </h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => downloadLetterPdf(letterPreview)} style={btnPrimary}>
                      Download PDF
                    </button>
                    <button onClick={() => setLetterPreview(null)} style={btnOutline}>
                      Close
                    </button>
                  </div>
                </div>
                <pre style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "Consolas, monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  padding: 16,
                  background: "#f8fafc",
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 8,
                  maxHeight: 500,
                  overflowY: "auto"
                }}>{letterPreview.body}</pre>
              </div>
            )}

            <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>
              My letters
            </h3>
            {letters.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                No letters generated yet.
              </p>
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
                      {l.reference_number} · Issued {new Date(l.issued_at).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => openLetter(l.letter_id)} style={btnOutline}>
                    Open
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ================= CERTIFY TAB ================= */}
        {tab === "certify" && (
          <section>
            <h2 style={section.title}>Certify a document</h2>
            <p style={section.subtitle}>
              Upload a document (ID, certificate, statement, etc.). A police officer will
              certify it and you can then download the certified copy from this page.
            </p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 24, marginBottom: 20
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                New certification request
              </h3>
              <form onSubmit={submitCertifiedDoc}>
                <label style={labelStyle}>Document title</label>
                <input required
                  placeholder="e.g. National ID copy"
                  value={certForm.document_title}
                  onChange={e => setCertForm(p => ({ ...p, document_title: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Purpose</label>
                <input
                  placeholder="e.g. For university admission"
                  value={certForm.purpose}
                  onChange={e => setCertForm(p => ({ ...p, purpose: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Notes (optional)</label>
                <textarea rows={3}
                  value={certForm.notes}
                  onChange={e => setCertForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Upload document</label>
                <input type="file" required ref={certFileRef}
                  onChange={e => setCertFile(e.target.files?.[0] || null)}
                  style={{ marginBottom: 14 }} />
                {certFile && (
                  <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 14 }}>
                    {certFile.name} · {Math.round(certFile.size / 1024)} KB
                  </p>
                )}

                {certMsg && (
                  <p style={{
                    color: certMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{certMsg}</p>
                )}
                <button type="submit" style={btnPrimary}>Submit for certification</button>
              </form>
            </div>

            {unreadCertNotifs > 0 && (
              <div style={{
                background: COLORS.blueLight, border: `1px solid ${COLORS.blue}`,
                borderRadius: 10, padding: 14, marginBottom: 20
              }}>
                <strong style={{ fontSize: 13, color: COLORS.blue }}>
                  Updates on your certified documents
                </strong>
                {certNotifications.filter(n => !n.read_at).map(n => (
                  <div key={n.notification_id} style={{ marginTop: 8, fontSize: 13, color: COLORS.textMid }}>
                    <span>{n.message}</span>{" "}
                    <button onClick={() => markCertNotifRead(n.notification_id)} style={{
                      border: 0, background: "transparent", color: COLORS.blue,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12
                    }}>Dismiss</button>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>
              My certification requests
            </h3>
            {certDocs.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                You have not submitted any documents for certification.
              </p>
            )}
            {certDocs.map(d => (
              <article key={d.certified_doc_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{d.document_title}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                      {d.reference_number} · {d.status.replace(/_/g, " ")}
                      {" · Submitted "}{new Date(d.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => openCertDoc(d.certified_doc_id)} style={btnOutline}>
                      View
                    </button>
                    {d.certified_available && (
                      <button onClick={() => downloadCertified(d.certified_doc_id)} style={btnPrimary}>
                        Download certified
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ================= NOTIFICATIONS TAB ================= */}
        {tab === "notifications" && (
          <section>
            <h2 style={section.title}>Notifications</h2>
            <p style={section.subtitle}>Updates on your reports and requests.</p>
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
                    <strong style={{ fontSize: 13 }}>{n.title}</strong>
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

        {/* ================= FEEDBACK TAB ================= */}
        {tab === "feedback" && (
          <section>
            <h2 style={section.title}>Feedback</h2>
            <p style={section.subtitle}>Tell us how we did. Your feedback helps improve service.</p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 24, marginBottom: 20
            }}>
              <form onSubmit={submitFeedback}>
                <label style={labelStyle}>Related application (optional)</label>
                <select value={feedbackForm.application_id}
                  onChange={e => setFeedbackForm(p => ({ ...p, application_id: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="">— None —</option>
                  {applications.map(a => (
                    <option key={a.application_id} value={a.application_id}>
                      {a.reference_number} · {a.title}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Rating (1–5)</label>
                <input type="number" min={1} max={5}
                  value={feedbackForm.rating}
                  onChange={e => setFeedbackForm(p => ({ ...p, rating: Number(e.target.value) }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Comments</label>
                <textarea rows={4}
                  value={feedbackForm.comments}
                  onChange={e => setFeedbackForm(p => ({ ...p, comments: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                {feedbackMsg && (
                  <p style={{
                    color: feedbackMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{feedbackMsg}</p>
                )}
                <button type="submit" style={btnPrimary}>Submit feedback</button>
              </form>
            </div>

            <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>My past feedback</h3>
            {feedback.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No feedback submitted yet.</p>
            )}
            {feedback.map(f => (
              <article key={f.feedback_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13 }}>Rating: {f.rating}/5</strong>
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
      </div>

      {/* ============== APPLICATION FORM OVERLAY ============== */}
      {activeType && (
        <Overlay onClose={closeType}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>{activeType.label}</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.textMuted }}>
            {activeType.description}
          </p>
          <form onSubmit={submit}>
            <label style={labelStyle}>Title / subject</label>
            <input required value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Description</label>
            <textarea required rows={4} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Urgency</label>
            <select value={form.urgency}
              onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {(FIELDS_BY_TYPE[activeType.key] || []).map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea rows={3} value={fields[f.key] || ""}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle} />
                ) : (
                  <input type={f.type} value={fields[f.key] || ""}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle} />
                )}
              </div>
            ))}

            <label style={labelStyle}>Attach evidence (optional, up to 10 files)</label>
            <input type="file" multiple
              onChange={e => setEvidence(Array.from(e.target.files || []))} />
            {evidence.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12, color: COLORS.textMid }}>
                {evidence.map((f, i) => <li key={i}>{f.name} · {Math.round(f.size / 1024)} KB</li>)}
              </ul>
            )}

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

      {/* ============== APPLICATION DETAIL OVERLAY ============== */}
      {selected && detail && (
        <Overlay onClose={() => { setSelected(null); setDetail(null); }}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {selected.reference_number}
          </h2>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.textMuted }}>
            {selected.title} · {selected.category_name}
          </p>

          <Row label="Status" value={selected.status.replace(/_/g, " ")} />
          <Row label="Urgency" value={selected.urgency} />
          <Row label="Submitted" value={new Date(selected.submitted_at).toLocaleString()} />
          {selected.admin_notes && <Row label="Officer note" value={selected.admin_notes} />}
          {selected.rejection_reason && <Row label="Rejection reason" value={selected.rejection_reason} />}

          <h3 style={subHeading}>Details</h3>
          {detail.values?.map((v, i) => (
            <Row key={i} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
          ))}

          {detail.evidence?.length > 0 && (
            <>
              <h3 style={subHeading}>Evidence</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                {detail.evidence.map(e => (
                  <li key={e.evidence_id}>
                    <a href={`${API_BASE.replace("/api", "")}${e.storage_path}`}
                       target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
                      {e.original_filename}
                    </a>{" "}
                    <small style={{ color: COLORS.textMuted }}>({e.verification_status})</small>
                  </li>
                ))}
              </ul>
            </>
          )}

          {detail.appointments?.length > 0 && (
            <>
              <h3 style={subHeading}>Appointments</h3>
              {detail.appointments.map(a => (
                <Row key={a.appointment_id}
                  label={new Date(a.appointment_date).toLocaleString()}
                  value={`${a.appointment_type} · ${a.appointment_status}`} />
              ))}
            </>
          )}

          {detail.payments?.length > 0 && (
            <>
              <h3 style={subHeading}>Payments</h3>
              {detail.payments.map(p => (
                <Row key={p.payment_id}
                  label={`${p.fee_type} · M ${Number(p.amount).toFixed(2)}`}
                  value={p.payment_status} />
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

      {/* ============== CERTIFIED DOC DETAIL OVERLAY ============== */}
      {certDetail && (
        <Overlay onClose={() => setCertDetail(null)}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {certDetail.document.reference_number}
          </h2>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.textMuted }}>
            {certDetail.document.document_title}
          </p>

          <Row label="Status" value={certDetail.document.status.replace(/_/g, " ")} />
          <Row label="Purpose" value={certDetail.document.purpose || "—"} />
          <Row label="Submitted" value={new Date(certDetail.document.submitted_at).toLocaleString()} />
          {certDetail.document.certified_at && (
            <Row label="Certified at" value={new Date(certDetail.document.certified_at).toLocaleString()} />
          )}
          {certDetail.document.certifying_officer && (
            <Row label="Certifying officer" value={certDetail.document.certifying_officer} />
          )}
          {certDetail.document.admin_notes && (
            <Row label="Officer note" value={certDetail.document.admin_notes} />
          )}
          {certDetail.document.rejection_reason && (
            <Row label="Rejection reason" value={certDetail.document.rejection_reason} />
          )}

          <h3 style={subHeading}>Files</h3>
          <div style={{ fontSize: 13 }}>
            <p style={{ margin: "6px 0" }}>
              <strong>Original:</strong>{" "}
              <a
                href={`${API_BASE.replace("/api", "")}${certDetail.document.original_url}`}
                target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}
              >
                {certDetail.document.original_filename}
              </a>
            </p>
            {certDetail.document.certified_url && (
              <p style={{ margin: "6px 0" }}>
                <strong>Certified:</strong>{" "}
                <button onClick={() => downloadCertified(certDetail.document.certified_doc_id)} style={{
                  border: 0, background: "transparent", color: COLORS.blue,
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0
                }}>Download certified copy</button>
              </p>
            )}
          </div>

          {certDetail.payments?.length > 0 && (
            <>
              <h3 style={subHeading}>Payments</h3>
              {certDetail.payments.map(p => (
                <Row key={p.payment_id}
                  label={`${p.fee_type} · M ${Number(p.amount).toFixed(2)}`}
                  value={p.payment_status} />
              ))}
            </>
          )}

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button onClick={() => setCertDetail(null)} style={btnPrimary}>Close</button>
          </div>
        </Overlay>
      )}
    </main>
  );
}

// ============================================================
// Sub-components
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

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 28,
        maxWidth: 760, width: "100%", maxHeight: "90vh",
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

export default PoliceDashboard;
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import Navbar from "../components/Navbar";
import DashboardSearch, { matchesDashboardSearch } from "../components/DashboardSearch";
import { auth, API_BASE } from "../Database/firebase";
import CollectionCentreReferral from "../components/CollectionCentreReferral";

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

const TIER_ORDER = ["standard", "urgent", "express", "emergency", "official", "diplomatic"];

const TIER_META = {
  standard:   { label: "Standard",   color: "#175cd3", bg: "#eff8ff", note: "Best value" },
  urgent:     { label: "Urgent",     color: "#b45309", bg: "#fff4df", note: "Faster processing" },
  express:    { label: "Express",    color: "#b3261e", bg: "#fdecea", note: "Fastest tier" },
  emergency:  { label: "Emergency",  color: "#7a1fa2", bg: "#f5e9fb", note: "OBR from Police required — await response" },
  official:   { label: "Official",   color: "#0f766e", bg: "#e6f4f1", note: "Government business" },
  diplomatic: { label: "Diplomatic", color: "#334155", bg: "#eef1f5", note: "Foreign Affairs only" }
};

const APP_TYPE_LABEL = {
  first_time:  "First-time passport",
  renewal:     "Passport renewal",
  replacement: "Passport replacement"
};

const normalizePassportService = service => {
  if (service.service_code === "PP_EMERGENCY") {
    return {
      ...service,
      application_type: "first_time",
      service_name: "First-time passport — Emergency",
      description: "Emergency first-time passport application. Submit an OBR from Police and wait for the Passport Office response.",
      fee_amount: 600,
      requires_approval: 1
    };
  }
  if (service.service_code === "PP_REN_STD") {
    return {
      ...service,
      service_name: "Passport renewal",
      description: "Passport renewal — M130. Upload a clear image of the previous passport's first page showing its expiry date.",
      fee_amount: 130
    };
  }
  if (service.service_code === "PP_REP_STD") {
    return {
      ...service,
      service_name: "Passport replacement",
      description: "Passport replacement — M130. Complete and submit the required details before attending your appointment.",
      fee_amount: 130
    };
  }
  return service;
};

const isPassportNumberField = field => /passport.*(number|no\b)/i.test(
  `${field.field_key || ""} ${field.label || ""}`
);

// Statuses in which the citizen is still allowed to delete their own application
const DELETABLE_STATUSES = ["submitted", "more_information_required"];

function PassportOfficeDashboard({ onLogout }) {
  const [tab, setTab] = useState("apply");
  const [searchQuery, setSearchQuery] = useState("");
  const [firstTimeOptionsOpen, setFirstTimeOptionsOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [activeService, setActiveService] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [extraDocs, setExtraDocs] = useState([]);
  const [passportSizePhoto, setPassportSizePhoto] = useState(null);
  const [passportProof, setPassportProof] = useState(null);
  const [emergencyObr, setEmergencyObr] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedApp, setSelectedApp] = useState(null);
  const [detail, setDetail] = useState(null);

  const [certificate, setCertificate] = useState(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);

  const [complaintForm, setComplaintForm] = useState({ subject: "", description: "" });
  const [complaintMsg, setComplaintMsg] = useState("");
  const [complaintSending, setComplaintSending] = useState(false);

  // Tracks which application is currently being deleted (for the spinner/disabled state)
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [meRes, svcRes, appsRes, notifRes, compRes] = await Promise.all([
        api("/me"),
        api("/passport/services"),
        api("/passport/applications/my"),
        api("/passport/notifications"),
        api("/passport/complaints/my")
      ]);
      setMe(meRes.user);
      setServices((svcRes.services || []).map(normalizePassportService));
      setApplications(appsRes.applications || []);
      setNotifications(notifRes.notifications || []);
      setComplaints(compRes.complaints || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const groupedServices = useMemo(() => {
    const out = {};
    for (const s of services) {
      const t = s.application_type || "first_time";
      if (t === "first_time" && !["PP_FIRST_STD", "PP_EMERGENCY"].includes(s.service_code)) continue;
      if (t === "renewal" && s.service_code !== "PP_REN_STD") continue;
      if (t === "replacement" && s.service_code !== "PP_REP_STD") continue;
      out[t] = out[t] || {};
      const tier = s.processing_tier || "standard";
      out[t][tier] = out[t][tier] || [];
      out[t][tier].push(s);
    }
    return out;
  }, [services]);

  const visibleServiceTypes = useMemo(() => {
    return ["first_time", "renewal", "replacement"].map(appType => ({
      appType,
      services: TIER_ORDER
        .flatMap(tier => groupedServices[appType]?.[tier] || [])
        .filter(service => matchesDashboardSearch(service, searchQuery))
    }));
  }, [groupedServices, searchQuery]);

  const isEmergencyFirstTime = activeService?.service_code === "PP_EMERGENCY";
  const isRenewal = activeService?.application_type === "renewal";
  const isReplacement = activeService?.application_type === "replacement";
  const isDamagedReplacement = isReplacement && values.replacement_condition === "Damaged";
  const isLostReplacement = isReplacement && values.replacement_condition === "Lost";
  const lostPassportNumberField = fields.find(isPassportNumberField) || {
    field_key: "passport_number",
    label: "Lost passport number",
    field_type: "text",
    required: true,
    placeholder: "Enter the number printed on the passport"
  };
  const canContinueForm = Boolean(activeService && passportSizePhoto) &&
    (!isEmergencyFirstTime || Boolean(emergencyObr)) &&
    (!isRenewal || Boolean(passportProof)) &&
    (!isDamagedReplacement || Boolean(passportProof)) &&
    (!isReplacement || Boolean(values.replacement_condition)) &&
    (!isLostReplacement || Boolean(values.passport_number?.trim()));
  const additionalPassportFields = fields.filter(field =>
    !(isLostReplacement && isPassportNumberField(field))
  );

  function openService(serviceId) {
    setSubmitError("");
    setValues({});
    setExtraDocs([]);
    setPassportSizePhoto(null);
    setPassportProof(null);
    setEmergencyObr(null);
    api(`/passport/services/${serviceId}`)
      .then(data => {
        setActiveService(normalizePassportService(data.service));
        setFields(data.fields);
      })
      .catch(err => alert(err.message));
  }

  function closeService() {
    setActiveService(null);
    setFields([]);
    setExtraDocs([]);
    setPassportSizePhoto(null);
    setPassportProof(null);
    setEmergencyObr(null);
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");

    if (!passportSizePhoto) {
      setSubmitError("Upload a passport-size photo for this application before continuing.");
      return;
    }

    if (isEmergencyFirstTime && !emergencyObr) {
      setSubmitError("Upload the OBR from Police before submitting an emergency application.");
      return;
    }
    if (isRenewal && !passportProof) {
      setSubmitError("Upload a clear image of the expired passport's information page before continuing.");
      return;
    }
    if (isReplacement && !values.replacement_condition) {
      setSubmitError("Choose whether the passport is lost or damaged.");
      return;
    }
    if (isDamagedReplacement && !passportProof) {
      setSubmitError("Upload a clear image of the damaged passport's information page before continuing.");
      return;
    }
    if (isLostReplacement && !values.passport_number?.trim()) {
      setSubmitError("Enter the passport number before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("serviceId", activeService.service_id);
      fd.append("fields", JSON.stringify(values));
      fd.append("documents", passportSizePhoto, `passport_size_photo__${passportSizePhoto.name}`);
      if (passportProof) {
        const prefix = isRenewal ? "passport_renewal_expired__" : "passport_damaged__";
        fd.append("documents", passportProof, `${prefix}${passportProof.name}`);
      }
      if (emergencyObr) {
        fd.append("documents", emergencyObr, `emergency_obr__${emergencyObr.name}`);
      }
      for (const f of extraDocs) {
        if (f instanceof File) fd.append("documents", f, `doc__${f.name}`);
      }
      const res = await api("/passport/applications", { method: "POST", body: fd });
      closeService();
      await load();
      alert(
        `Submitted.\nReference: ${res.referenceNumber}\n` +
        `Tier: ${TIER_META[res.tier]?.label || res.tier} · Fee: M ${Number(res.fee).toFixed(2)}`
      );
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- DELETE APPLICATION ----------
  async function deleteApplication(app) {
    const ok = window.confirm(
      `Delete application ${app.reference_number}?\n\n` +
      `This cannot be undone. You will need to submit a new application.`
    );
    if (!ok) return;

    setDeletingId(app.application_id);
    try {
      await api(`/passport/applications/${app.application_id}`, { method: "DELETE" });

      // If the deleted app was the one open in the detail panel, close it
      if (selectedApp?.application_id === app.application_id) {
        setSelectedApp(null);
        setDetail(null);
      }
      if (certificate?.application?.application_id === app.application_id) {
        setCertificate(null);
      }

      await load();
      alert(`Application ${app.reference_number} has been deleted.`);
    } catch (err) {
      alert("Could not delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function openDetail(id) {
    try {
      const data = await api(`/passport/applications/${id}`);
      setSelectedApp(data.application);
      setDetail(data);
    } catch (err) { alert(err.message); }
  }

  async function viewCertificate(id) {
    try {
      const data = await api(`/passport/certificates/${id}`);
      setCertificate(data);
    } catch (err) { alert(err.message); }
  }

  async function markRead(id) {
    try {
      await api(`/passport/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev =>
        prev.map(n => n.notification_id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (err) { console.error(err); }
  }

  async function submitComplaint(e) {
    e.preventDefault();
    setComplaintMsg("");
    setComplaintSending(true);
    try {
      await api("/passport/complaints", {
        method: "POST",
        body: JSON.stringify(complaintForm)
      });
      setComplaintForm({ subject: "", description: "" });
      setComplaintMsg("Your complaint has been submitted.");
      const compRes = await api("/passport/complaints/my");
      setComplaints(compRes.complaints || []);
    } catch (err) {
      setComplaintMsg("Error: " + err.message);
    } finally { setComplaintSending(false); }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    const okTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!okTypes.includes(file.type)) {
      setPhotoError("Only JPG, JPEG, or PNG photos are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Photo must be smaller than 5 MB.");
      return;
    }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await api("/me/photo", { method: "POST", body: fd });
      setMe(res.user);
      sessionStorage.setItem("user-profile", JSON.stringify(res.user));
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  const unread = notifications.filter(n => !n.read_at).length;

  return (
    <main className="dashboard-page passport-office-dashboard" style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={{
            ...header.content,
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 24, flexWrap: "wrap"
          }}>
            <div>
              <p style={header.eyebrow}>Department of Home Affairs · Passport Office</p>
              <h1 style={header.title}>Passport Services</h1>
            </div>
            <DashboardSearch onSearch={setSearchQuery} />
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        <Navbar
          items={[
            ["apply", "Apply"],
            ["mine", `My applications (${applications.length})`],
            ["notifications", `Notifications${unread ? ` (${unread})` : ""}`],
            ["complaints", `Complaints${complaints.length ? ` (${complaints.length})` : ""}`],
            ["profile", "Profile"]
          ]}
          activeTab={tab}
          onTabChange={setTab}
          onLogout={onLogout}
          user={me}
        />

        {tab === "apply" && (
          <section style={section.wrapper}>
            <h2 style={section.title}>Available passport services</h2>

            <div style={{
              marginBottom: 20, padding: 14, background: "#eff8ff",
              border: "1px solid #175cd344", borderRadius: 8,
              fontSize: 13, color: COLORS.blue
            }}>
              A passport-size photo must be uploaded for every application before the details form can be completed.
            </div>

            {Object.keys(groupedServices).length === 0 && (
              <div style={{
                padding: 40, textAlign: "center", background: "#fff",
                border: `1px solid ${COLORS.border}`, borderRadius: 12,
                color: COLORS.textMuted, fontSize: 13
              }}>No passport services are currently available.</div>
            )}

            {Object.keys(groupedServices).length > 0 && (
              <div style={passportServiceGrid}>
                {visibleServiceTypes.map(({ appType, services: serviceOptions }) => (
                  <article key={appType} style={passportServiceCard}>
                    <button
                      type="button"
                      disabled={serviceOptions.length === 0}
                      onClick={() => appType === "first_time"
                        ? setFirstTimeOptionsOpen(open => !open)
                        : serviceOptions[0] && openService(serviceOptions[0].service_id)}
                      className="passport-service-button"
                      style={{
                        ...passportServiceButton,
                        ...(serviceOptions.length === 0 ? passportServiceButtonDisabled : {})
                      }}
                    >
                      <span className="passport-service-icon-box" style={passportServiceIconBox} aria-hidden="true">
                        <PassportServiceIcon type={appType} />
                      </span>
                      <span className="passport-service-title" style={passportServiceTitle}>
                        {appType === "first_time"
                          ? "First-time Passport (Standard & Urgent)"
                          : APP_TYPE_LABEL[appType]}
                      </span>
                    </button>

                    {appType === "first_time" && firstTimeOptionsOpen && serviceOptions.length > 0 && (
                      <div style={passportServiceOptions}>
                        {serviceOptions.map(svc => {
                          const tierKey = svc.processing_tier || "standard";
                          const meta = TIER_META[tierKey] || TIER_META.standard;
                          return (
                            <button
                              key={svc.service_id}
                              type="button"
                              onClick={() => {
                                setFirstTimeOptionsOpen(false);
                                openService(svc.service_id);
                              }}
                              className="passport-service-option"
                              style={{
                                ...passportServiceOption,
                                borderLeft: `3px solid ${meta.color}`
                              }}
                            >
                              <span>{meta.label}</span>
                              <strong style={{ color: COLORS.blue }}>
                                M {Number(svc.fee_amount).toFixed(2)}
                              </strong>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            {Object.keys(groupedServices).length > 0 &&
              visibleServiceTypes.every(group => group.services.length === 0) && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                No passport services match your search.
              </p>
            )}
          </section>
        )}

        {tab === "mine" && (
          <section>
            <h2 style={section.title}>My passport applications</h2>
            <p style={section.subtitle}>Track every passport request you've submitted.</p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16
            }}>
              {applications.length === 0 && (
                <div style={{
                  gridColumn: "1 / -1", padding: 40, textAlign: "center",
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, color: COLORS.textMuted, fontSize: 13
                }}>You have no passport applications yet.</div>
              )}
              {applications.filter(a => matchesDashboardSearch(a, searchQuery)).map(a => {
                const canDelete = DELETABLE_STATUSES.includes(a.status);
                const isDeleting = deletingId === a.application_id;

                return (
                  <article key={a.application_id} style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 20,
                    boxShadow: "0 2px 8px rgba(0,32,159,0.05)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.blue, fontFamily: "Consolas, monospace" }}>
                        {a.reference_number}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, color: COLORS.textDark }}>
                      {a.service_name}
                    </h3>
                    <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.textMuted }}>
                      {a.application_type.replace(/_/g, " ")}
                      {a.processing_tier ? ` · ${TIER_META[a.processing_tier]?.label || a.processing_tier}` : ""}
                      {a.processing_days ? ` · ${a.processing_days} days` : ""}
                      {" · Submitted "}{new Date(a.submitted_at).toLocaleDateString()}
                    </p>
                    {a.admin_notes && (
                      <p style={{
                        margin: "0 0 14px", padding: 10, background: COLORS.blueLight,
                        borderRadius: 6, fontSize: 12, color: COLORS.textMid, lineHeight: 1.5
                      }}>
                        <strong>Officer note:</strong> {a.admin_notes}
                      </p>
                    )}
                    {a.rejection_reason && (
                      <p style={{
                        margin: "0 0 14px", padding: 10, background: "#fdecea",
                        borderRadius: 6, fontSize: 12, color: "#b3261e", lineHeight: 1.5
                      }}>
                        <strong>Rejection reason:</strong> {a.rejection_reason}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                      <button onClick={() => openDetail(a.application_id)} style={btnOutline}>
                        View details
                      </button>
                      {["approved", "in_production", "ready_for_collection", "collected"].includes(a.status) && (
                        <button onClick={() => viewCertificate(a.application_id)} style={btnPrimary}>
                          Passport
                        </button>
                      )}
                      <button
                        onClick={() => deleteApplication(a)}
                        disabled={!canDelete || isDeleting}
                        title={
                          !canDelete
                            ? `Cannot delete — status is "${a.status.replace(/_/g, " ")}". Contact the Passport Office if you need to cancel.`
                            : "Delete this application"
                        }
                        style={{
                          ...btnDanger,
                          opacity: (!canDelete || isDeleting) ? 0.5 : 1,
                          cursor: (!canDelete || isDeleting) ? "not-allowed" : "pointer"
                        }}
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                    {!canDelete && (
                      <p style={{
                        margin: "10px 0 0", fontSize: 11, color: COLORS.textMuted,
                        lineHeight: 1.5
                      }}>
                        This application can no longer be deleted because its status is{" "}
                        <strong>{a.status.replace(/_/g, " ")}</strong>. Please contact the Passport Office if you need to cancel it.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === "notifications" && (
          <section>
            <h2 style={section.title}>Notifications</h2>
            <p style={section.subtitle}>Updates on your passport applications.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {notifications.length === 0 && (
                <div style={{
                  padding: 40, textAlign: "center", background: "#fff",
                  border: `1px solid ${COLORS.border}`, borderRadius: 12,
                  color: COLORS.textMuted, fontSize: 13
                }}>No notifications yet.</div>
              )}
              {notifications.filter(n => matchesDashboardSearch(n, searchQuery)).map(n => (
                <article key={n.notification_id} style={{
                  background: n.read_at ? "#fff" : COLORS.blueLight,
                  border: `1px solid ${n.read_at ? COLORS.border : COLORS.blue}`,
                  borderRadius: 10, padding: 16
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <strong style={{ fontSize: 13, color: COLORS.textDark }}>{n.title}</strong>
                    <small style={{ color: COLORS.textMuted, fontSize: 11 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </small>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textMid, lineHeight: 1.55 }}>
                    {n.message}
                  </p>
                  {!n.read_at && (
                    <button onClick={() => markRead(n.notification_id)} style={{
                      marginTop: 10, border: 0, background: "transparent",
                      color: COLORS.blue, fontWeight: 700, fontSize: 12,
                      cursor: "pointer", padding: 0, fontFamily: "inherit"
                    }}>Mark as read</button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "complaints" && (
          <section>
            <h2 style={section.title}>Complaints and enquiries</h2>
            <p style={section.subtitle}>
              Send a message to the Passport Office about delays or service issues.
            </p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 24, marginBottom: 20
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                Submit a new complaint
              </h3>
              <form onSubmit={submitComplaint}>
                <label style={labelStyle}>Subject</label>
                <input
                  value={complaintForm.subject}
                  onChange={e => setComplaintForm(p => ({ ...p, subject: e.target.value }))}
                  required
                  style={{ ...inputStyle, marginBottom: 14 }}
                />
                <label style={labelStyle}>Description</label>
                <textarea
                  value={complaintForm.description}
                  onChange={e => setComplaintForm(p => ({ ...p, description: e.target.value }))}
                  required rows={4}
                  style={{ ...inputStyle, marginBottom: 14 }}
                />
                {complaintMsg && (
                  <p style={{
                    color: complaintMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{complaintMsg}</p>
                )}
                <button type="submit" disabled={complaintSending} style={btnPrimary}>
                  {complaintSending ? "Sending…" : "Submit complaint"}
                </button>
              </form>
            </div>

            <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>
              Your previous complaints
            </h3>
            {complaints.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No complaints submitted yet.</p>
            )}
            {complaints.filter(c => matchesDashboardSearch(c, searchQuery)).map(c => (
              <article key={c.complaint_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 12
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{c.subject}</strong>
                  <StatusBadge status={c.complaint_status} />
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.textMid }}>
                  {c.description}
                </p>
                {c.admin_response && (
                  <div style={{
                    padding: 10, background: COLORS.blueLight,
                    borderRadius: 6, fontSize: 12, color: COLORS.textMid
                  }}>
                    <strong>Response:</strong> {c.admin_response}
                  </div>
                )}
                <small style={{ color: COLORS.textMuted, fontSize: 11 }}>
                  Submitted {new Date(c.submitted_at).toLocaleString()}
                </small>
              </article>
            ))}
          </section>
        )}

        {tab === "profile" && me && (
          <section>
            <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: COLORS.blue }}>
              My profile
            </h3>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Your verified identity on the Lesotho Government Services platform.
            </p>

            <div className="profile-settings-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 20, marginTop: 16 }}>
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.blue} 0%, #001a80 100%)`,
                color: "#fff", borderRadius: 12, padding: 22,
                aspectRatio: "85/54", maxWidth: 420,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                boxShadow: "0 12px 28px rgba(0,32,159,0.25)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.85 }}>
                      Kingdom of Lesotho
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700 }}>
                      National Identity Card
                    </p>
                  </div>
                  <div style={{
                    width: 72, height: 92, borderRadius: 4,
                    background: "rgba(255,255,255,0.12)",
                    display: "grid", placeItems: "center", overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.2)"
                  }}>
                    {me.photo_url ? (
                      <img src={me.photo_url} alt="ID"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 700 }}>NO PHOTO</span>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>ID NUMBER</p>
                  <p style={{
                    margin: "2px 0 10px", fontSize: 16, fontWeight: 700,
                    letterSpacing: 1.4, fontFamily: "Consolas, monospace"
                  }}>{me.national_id_number || me.national_id || "—"}</p>
                  <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>NAME</p>
                  <p style={{ margin: "2px 0 10px", fontSize: 13, fontWeight: 600 }}>
                    {me.full_name}
                  </p>
                </div>
              </div>

              <div>
                <div className="profile-settings-card" style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 20, marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                    Profile details
                  </h3>
                  <ProfileRow label="Full name" value={me.full_name} />
                  <ProfileRow label="Email" value={me.email || "—"} />
                  <ProfileRow label="Phone" value={me.phone || "—"} />
                  <ProfileRow label="National ID" value={me.national_id_number || me.national_id || "—"} />
                  <ProfileRow label="Account status" value={me.account_status} />
                  <ProfileRow label="Member since" value={new Date(me.created_at).toLocaleDateString()} />
                </div>

                <div className="profile-settings-card" style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 20, marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 14, color: COLORS.blue }}>
                    Identity photo
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: COLORS.textMuted }}>
                    This photo appears on your ID and will be used on your passport.
                  </p>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                    <div className="profile-settings-photo-placeholder" style={{
                      width: 90, height: 116, borderRadius: 6,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.lightBg,
                      display: "grid", placeItems: "center", overflow: "hidden"
                    }}>
                      {me.photo_url ? (
                        <img src={me.photo_url} alt="My photo"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 10, color: COLORS.textMuted, padding: 6, textAlign: "center" }}>
                          No photo yet
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handlePhotoUpload}
                        style={{ display: "none" }}
                        id="profile-photo-upload"
                      />
                      <label htmlFor="profile-photo-upload" style={{
                        display: "inline-block", padding: "11px 20px",
                        background: COLORS.blue, color: "#fff",
                        borderRadius: 6, fontSize: 13, fontWeight: 700,
                        cursor: photoUploading ? "wait" : "pointer",
                        opacity: photoUploading ? 0.6 : 1
                      }}>
                        {photoUploading ? "Uploading…" : me.photo_url ? "Replace photo" : "Upload photo"}
                      </label>
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                        JPG or PNG · max 5 MB
                      </p>
                      {photoError && (
                        <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.error }}>
                          {photoError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {activeService && (
        <Overlay className="passport-application" onClose={closeService}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>{activeService.service_name}</h2>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.textMuted }}>
            {activeService.description}
          </p>

          <div className="passport-service-summary" style={{
            display: "flex", gap: 16, flexWrap: "wrap",
            padding: "10px 14px", background: COLORS.blueLight,
            borderRadius: 8, marginBottom: 18, fontSize: 12,
            color: COLORS.textMid, fontWeight: 600
          }}>
            {activeService.application_type === "first_time" && <span>
              Tier:{" "}
              <strong style={{ color: TIER_META[activeService.processing_tier]?.color }}>
                {TIER_META[activeService.processing_tier]?.label || activeService.processing_tier}
              </strong>
            </span>}
            <span>Fee: <strong>M {Number(activeService.fee_amount).toFixed(2)}</strong></span>
            <span>Processing: <strong>{activeService.processing_days} working days</strong></span>
          </div>

          <form onSubmit={submit}>
            <PassportDocumentUpload
              label="Passport-size photo"
              instructions="Upload a clear passport-size photo for this application. This photo is required before any application details can be completed."
              accept="image/*"
              file={passportSizePhoto}
              onChange={setPassportSizePhoto}
            />

            {passportSizePhoto && isReplacement && (
              <Field
                field={{
                  field_key: "replacement_condition",
                  label: "What happened to your passport?",
                  field_type: "select",
                  options: ["Lost", "Damaged"],
                  required: true
                }}
                value={values.replacement_condition || ""}
                onChange={value => {
                  setValues(previous => ({
                    ...previous,
                    replacement_condition: value,
                    passport_number: value === "Lost" ? previous.passport_number || "" : ""
                  }));
                  setPassportProof(null);
                }}
              />
            )}

            {passportSizePhoto && isLostReplacement && (
              <>
                <div className="passport-form-warning" style={{
                  padding: 12, marginBottom: 14, borderRadius: 6,
                  background: "#fff4df", border: "1px solid #f0c36d",
                  color: "#7a3f00", fontSize: 13, lineHeight: 1.5
                }}>
                  Enter the passport number before continuing. An incorrect passport number will result in a five-year passport suspension.
                </div>
                <Field
                  field={{ ...lostPassportNumberField, label: "Lost passport number", required: true }}
                  value={values[lostPassportNumberField.field_key] || ""}
                  onChange={value => setValues(previous => ({
                    ...previous,
                    [lostPassportNumberField.field_key]: value,
                    passport_number: value
                  }))}
                />
              </>
            )}

            {passportSizePhoto && isDamagedReplacement && (
              <PassportDocumentUpload
                label="Damaged passport information page"
                instructions="Upload a clear photo of the passport's first page, showing your name and personal information. You must upload it before continuing to the details form."
                accept="image/*"
                file={passportProof}
                onChange={setPassportProof}
              />
            )}

            {passportSizePhoto && isRenewal && (
              <PassportDocumentUpload
                label="Expired passport information page"
                instructions="Upload a clear photo of the expired passport's first page, showing your name and personal information. You must upload it before continuing to the renewal form."
                accept="image/*"
                file={passportProof}
                onChange={setPassportProof}
              />
            )}

            {passportSizePhoto && isEmergencyFirstTime && (
              <PassportDocumentUpload
                label="OBR from Police"
                instructions="Upload the OBR issued by Police with your emergency application. After submitting, wait for the Passport Office response before taking further action."
                accept=".pdf,image/*"
                file={emergencyObr}
                onChange={setEmergencyObr}
              />
            )}

            {canContinueForm && additionalPassportFields.map(f => (
              <Field
                key={f.field_key}
                field={f}
                value={values[f.field_key] || ""}
                onChange={v => setValues(p => ({ ...p, [f.field_key]: v }))}
              />
            ))}

            {isEmergencyFirstTime && !additionalPassportFields.some(f => f.field_key === "reason") && (
              <Field
                field={{
                  field_key: "reason",
                  label: "Reason for emergency application",
                  field_type: "textarea",
                  required: true
                }}
                value={values.reason || ""}
                onChange={value => setValues(previous => ({ ...previous, reason: value }))}
              />
            )}

            {canContinueForm && (
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Supporting documents (optional but recommended)
                </label>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textMuted }}>
                  National ID copy, birth certificate, previous passport, police report (for lost/stolen).
                </p>
                <input
                  type="file"
                  multiple
                  onChange={e => setExtraDocs(Array.from(e.target.files || []))}
                />
                {extraDocs.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: COLORS.textMid }}>
                    {extraDocs.map((f, i) => (
                      <li key={i}>{f.name} · {Math.round(f.size / 1024)} KB</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {submitError && (
              <p className="passport-submit-error" style={{
                color: COLORS.error, fontSize: 13,
                padding: 10, background: "#fdecea", borderRadius: 6
              }}>{submitError}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={closeService} className="passport-dialog-cancel" style={btnOutline}>Cancel</button>
              <button
                type="submit"
                disabled={submitting || !canContinueForm}
                style={{
                  ...btnPrimary,
                  opacity: (submitting || !canContinueForm) ? 0.55 : 1,
                  cursor: (submitting || !canContinueForm) ? "not-allowed" : "pointer"
                }}
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {selectedApp && detail && (
        <Overlay onClose={() => { setSelectedApp(null); setDetail(null); }}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {selectedApp.reference_number}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textMuted }}>
            {selectedApp.service_name} · {selectedApp.application_type.replace(/_/g, " ")}
          </p>

          {(selectedApp.passport_photo_url || detail.application?.passport_photo_url) && (
            <div style={{
              width: 120, height: 150, marginBottom: 16,
              border: `1px solid ${COLORS.border}`, borderRadius: 6,
              overflow: "hidden"
            }}>
              <img
                src={selectedApp.passport_photo_url || detail.application.passport_photo_url}
                alt="Passport"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}

          <ProfileRow label="Status" value={selectedApp.status.replace(/_/g, " ")} />
          <ProfileRow label="Submitted" value={new Date(selectedApp.submitted_at).toLocaleString()} />
          {selectedApp.admin_notes && (
            <ProfileRow label="Officer note" value={selectedApp.admin_notes} />
          )}

          <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>
            Submitted information
          </h3>
          {detail.values?.map(v => (
            <ProfileRow key={v.field_key} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
          ))}

          {detail.appointments?.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>Appointments</h3>
              {detail.appointments.map(a => (
                <ProfileRow key={a.appointment_id}
                  label={new Date(a.appointment_date).toLocaleString()}
                  value={`${a.appointment_type} · ${a.appointment_status}`} />
              ))}
            </>
          )}

          {detail.biometrics && (
            <>
              <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>Biometrics</h3>
              <ProfileRow label="Fingerprints" value={detail.biometrics.fingerprints_captured ? "Captured" : "Pending"} />
              <ProfileRow label="Photograph" value={detail.biometrics.photograph_captured ? "Captured" : "Pending"} />
              <ProfileRow label="Signature" value={detail.biometrics.signature_captured ? "Captured" : "Pending"} />
              <ProfileRow label="Enrolment" value={detail.biometrics.enrolment_status} />
            </>
          )}

          {detail.payments?.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>Payments</h3>
              {detail.payments.map(p => (
                <ProfileRow key={p.payment_id}
                  label={`${p.fee_type} · M ${Number(p.amount).toFixed(2)}`}
                  value={p.payment_status} />
              ))}
            </>
          )}

          {detail.passport?.passport_number && (
            <>
              <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>Issued passport</h3>
              <ProfileRow label="Passport number" value={detail.passport.passport_number} />
              <ProfileRow label="Issue date" value={detail.passport.issue_date || "—"} />
              <ProfileRow label="Expiry date" value={detail.passport.expiry_date || "—"} />
              <ProfileRow label="Production" value={detail.passport.production_status} />
            </>
          )}

          {detail.documents?.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>Documents</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                {detail.documents.map(d => (
                  <li key={d.document_id}>
                    <span>{d.original_filename}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Delete shortcut inside the detail overlay as well */}
          {DELETABLE_STATUSES.includes(selectedApp.status) && (
            <div style={{ marginTop: 20, textAlign: "left" }}>
              <button
                onClick={() => deleteApplication(selectedApp)}
                disabled={deletingId === selectedApp.application_id}
                style={{
                  ...btnDanger,
                  opacity: deletingId === selectedApp.application_id ? 0.5 : 1,
                  cursor: deletingId === selectedApp.application_id ? "not-allowed" : "pointer"
                }}
              >
                {deletingId === selectedApp.application_id
                  ? "Deleting…"
                  : "Delete this application"}
              </button>
            </div>
          )}

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button onClick={() => { setSelectedApp(null); setDetail(null); }} style={btnPrimary}>
              Close
            </button>
          </div>
        </Overlay>
      )}

      {certificate && (
        <Overlay onClose={() => setCertificate(null)}>
          <PassportView data={certificate} onClose={() => setCertificate(null)} />
        </Overlay>
      )}
    </main>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "8px 0", borderBottom: `1px solid ${COLORS.borderLight}`,
      fontSize: 13
    }}>
      <span style={{ color: COLORS.textMuted, textTransform: "capitalize" }}>{label}</span>
      <span style={{ color: COLORS.textDark, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Chip({ children, tone, className }) {
  const colors = tone === "warn"
    ? { bg: "#fff4df", fg: "#b45309" }
    : { bg: "#eff8ff", fg: "#175cd3" };
  return (
    <span className={className} style={{
      display: "inline-block", padding: "3px 9px",
      background: colors.bg, color: colors.fg,
      borderRadius: 20, fontWeight: 700, letterSpacing: 0.3
    }}>{children}</span>
  );
}

function Field({ field, value, onChange }) {
  const common = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${COLORS.border}`, borderRadius: 6,
    fontSize: 13, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box"
  };
  let input;
  if (field.field_type === "textarea") {
    input = (
      <textarea value={value} onChange={e => onChange(e.target.value)}
        required={field.required} rows={3} style={common} />
    );
  } else if (field.field_type === "select") {
    input = (
      <select value={value} onChange={e => onChange(e.target.value)}
        required={field.required} style={common}>
        <option value="">Select…</option>
        {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else {
    input = (
      <input type={field.field_type} value={value}
        onChange={e => onChange(e.target.value)}
        required={field.required} style={common}
        placeholder={field.placeholder || ""} />
    );
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 600,
        marginBottom: 6, color: COLORS.textMid
      }}>
        {field.label}{field.required ? " *" : ""}
      </label>
      {input}
    </div>
  );
}

function PassportDocumentUpload({ label, instructions, accept, file, onChange }) {
  return (
    <div className="passport-document-upload" style={{
      padding: 14, marginBottom: 16, borderRadius: 8,
      background: "#fff8e1", border: "1px solid #b4530955"
    }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 700,
        marginBottom: 6, color: COLORS.textDark
      }}>{label} *</label>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: COLORS.textMuted }}>
        {instructions}
      </p>
      <input
        type="file"
        accept={accept}
        required
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
      {file && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.textMid }}>
          Selected: {file.name}
        </p>
      )}
    </div>
  );
}

function Overlay({ children, onClose, className = "" }) {
  return (
    <div onClick={onClose} className={`passport-dashboard-overlay ${className}`} style={{
      position: "fixed", inset: 0, zIndex: 1300,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24
    }}>
      <div onClick={e => e.stopPropagation()} className="passport-dashboard-dialog" style={{
        background: "#fff", borderRadius: 12, padding: 28,
        maxWidth: 760, width: "100%", maxHeight: "90vh",
        overflowY: "auto", fontFamily: "Arial, sans-serif",
        boxShadow: "0 20px 60px rgba(0,32,159,0.25)"
      }}>{children}</div>
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
    closed: { bg: "#f1f5f9", fg: "#475569" }
  };
  const s = map[status] || { bg: "#f1f5f9", fg: "#475569" };
  return (
    <span className="dashboard-status-badge" style={{
      display: "inline-block", padding: "3px 10px",
      background: s.bg, color: s.fg, borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 0.4
    }}>{status.replace(/_/g, " ")}</span>
  );
}

// ============================================================
// PASSPORT VIEW WITH PDF
// ============================================================
function PassportView({ data, onClose }) {
  const { application, data: fields, passport } = data;

  const photoSrc =
    application.passport_photo_url || application.photo_url;

  return (
    <div>
      <div style={{
        background: "#f8fafc",
        border: `1px solid ${COLORS.blue}`,
        borderRadius: 8, padding: 20,
        maxWidth: 540, margin: "0 auto"
      }}>
        <div style={{
          textAlign: "center", borderBottom: `2px solid ${COLORS.blue}`,
          paddingBottom: 10, marginBottom: 12
        }}>
          <p style={{
            margin: 0, fontSize: 11, letterSpacing: 2,
            textTransform: "uppercase", color: COLORS.blue
          }}>Kingdom of Lesotho</p>
          <h2 style={{ margin: "4px 0 0", fontSize: 20, color: COLORS.blue, fontWeight: 700 }}>
            Passport
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
            Ministry of Home Affairs · Department of Passport Services
          </p>
        </div>

        {photoSrc && (
          <div style={{
            width: 88, height: 112, margin: "0 auto 14px",
            border: `1px solid ${COLORS.border}`, overflow: "hidden"
          }}>
            <img src={photoSrc} alt="Holder"
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: 1, color: COLORS.textMuted }}>
            PASSPORT NUMBER
          </p>
          <p style={{
            margin: "4px 0 0", fontSize: 20, fontWeight: 700,
            letterSpacing: 1, fontFamily: "Consolas, monospace",
            color: COLORS.blue
          }}>
            {passport?.passport_number || "PENDING"}
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 12, marginBottom: 14
        }}>
          <InfoBlock label="Surname" value={fields.surname || "—"} />
          <InfoBlock label="Given names" value={fields.given_names || "—"} />
          <InfoBlock label="Date of birth" value={fields.date_of_birth || "—"} />
          <InfoBlock label="Place of birth" value={fields.place_of_birth || "—"} />
          <InfoBlock label="Gender" value={fields.gender || "—"} />
          <InfoBlock label="Nationality" value={fields.nationality || "Mosotho"} />
          <InfoBlock label="Issue date" value={passport?.issue_date || "—"} />
          <InfoBlock label="Expiry date" value={passport?.expiry_date || "—"} />
        </div>

        <div style={{
          textAlign: "center", paddingTop: 12,
          borderTop: `1px solid ${COLORS.borderLight}`,
          fontSize: 10, color: COLORS.textMuted
        }}>
          This passport is the property of the Kingdom of Lesotho.<br />
          Reference: {application.reference_number}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
      </div>
      <CollectionCentreReferral department="Passport Services" />
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p style={{
        margin: 0, fontSize: 9, color: COLORS.textMuted,
        textTransform: "uppercase", letterSpacing: 0.6
      }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 12, color: COLORS.textDark, fontWeight: 600, lineHeight: 1.35 }}>
        {value}
      </p>
    </div>
  );
}

function PassportServiceIcon({ type }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === "renewal" ? (
        <>
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
        </>
      ) : type === "replacement" ? (
        <>
          <rect x="4" y="3" width="13" height="18" rx="2" />
          <path d="M8 8h5M8 12h3" />
          <path d="m17 14 4 4m0-4-4 4" />
        </>
      ) : (
        <>
          <rect x="4" y="2.5" width="16" height="19" rx="2" />
          <circle cx="12" cy="10" r="3" />
          <path d="M8 17h8M12 7v6M9 10h6" />
        </>
      )}
    </svg>
  );
}

const passportServiceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14
};

const passportServiceCard = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  gap: 10
};

const passportServiceIconBox = {
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  color: "#00209F",
  background: "#eff8ff",
  border: "1px solid #d1e9ff",
  borderRadius: 9
};

const passportServiceButton = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 14,
  width: "100%",
  minHeight: 80,
  padding: "12px 8px",
  color: COLORS.blue,
  background: "transparent",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  transition: "background 0.15s"
};

const passportServiceButtonDisabled = {
  color: COLORS.textMuted,
  background: "transparent",
  cursor: "not-allowed",
  opacity: 0.6
};

const passportServiceTitle = {
  maxWidth: "100%",
  color: "#1B3A8C",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.3,
  textAlign: "left"
};

const passportServiceOptions = {
  display: "grid",
  gap: 10
};

const passportServiceOption = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  color: COLORS.textDark,
  background: "#F8FAFC",
  border: `1px solid ${COLORS.borderLight}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  textAlign: "left"
};

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

export default PassportOfficeDashboard;
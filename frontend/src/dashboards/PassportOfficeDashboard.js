import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import { auth, API_BASE } from "../Database/firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  emergency:  { label: "Emergency",  color: "#7a1fa2", bg: "#f5e9fb", note: "48 hours — proof required" },
  official:   { label: "Official",   color: "#0f766e", bg: "#e6f4f1", note: "Government business" },
  diplomatic: { label: "Diplomatic", color: "#334155", bg: "#eef1f5", note: "Foreign Affairs only" }
};

const APP_TYPE_LABEL = {
  first_time:  "First-time passport",
  renewal:     "Passport renewal",
  replacement: "Passport replacement"
};

// Statuses in which the citizen is still allowed to delete their own application
const DELETABLE_STATUSES = ["submitted", "more_information_required"];

function PassportOfficeDashboard() {
  const [tab, setTab] = useState("apply");
  const [me, setMe] = useState(null);
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [activeService, setActiveService] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [extraDocs, setExtraDocs] = useState([]);
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
      setServices(svcRes.services || []);
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
      out[t] = out[t] || {};
      const tier = s.processing_tier || "standard";
      out[t][tier] = out[t][tier] || [];
      out[t][tier].push(s);
    }
    return out;
  }, [services]);

  function openService(serviceId) {
    setSubmitError("");
    setValues({});
    setExtraDocs([]);
    api(`/passport/services/${serviceId}`)
      .then(data => {
        setActiveService(data.service);
        setFields(data.fields);
      })
      .catch(err => alert(err.message));
  }

  function closeService() {
    setActiveService(null);
    setFields([]);
    setExtraDocs([]);
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");

    if (!me?.photo_url) {
      setSubmitError(
        "You need an ID photo on your Profile before applying for a passport. Please upload one on the Profile tab."
      );
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("serviceId", activeService.service_id);
      fd.append("fields", JSON.stringify(values));
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
  const activeApps = applications.filter(a =>
    ["submitted", "under_review", "more_information_required",
     "awaiting_payment", "awaiting_appointment", "awaiting_biometrics"].includes(a.status)
  ).length;
  const readyApps = applications.filter(a => a.status === "ready_for_collection").length;

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={header.content}>
            <p style={header.eyebrow}>Department of Home Affairs · Passport Office</p>
            <h1 style={header.title}>Passport Services</h1>
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
          <StatCard label="Active applications" value={activeApps} accent={COLORS.blue} />
          <StatCard label="Ready for collection" value={readyApps} accent={COLORS.green} />
          <StatCard label="Notifications" value={unread} accent={COLORS.blue} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["apply", "Apply"],
            ["mine", `My applications (${applications.length})`],
            ["notifications", `Notifications${unread ? ` (${unread})` : ""}`],
            ["complaints", `Complaints${complaints.length ? ` (${complaints.length})` : ""}`],
            ["profile", "Profile"]
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

        {tab === "apply" && (
          <section style={section.wrapper}>
            <h2 style={section.title}>Choose your passport</h2>
            <p style={section.subtitle}>
              Prices and processing times differ per tier. Pick the one that suits you.
            </p>

            {!me?.photo_url && (
              <div style={{
                marginBottom: 20, padding: 14, background: "#fff8e1",
                border: "1px solid #b4530955", borderRadius: 8,
                fontSize: 13, color: "#7a3f00"
              }}>
                <strong>ID photo required.</strong> Please upload your ID photo on the{" "}
                <button type="button" onClick={() => setTab("profile")} style={{
                  border: 0, background: "transparent", padding: 0,
                  color: COLORS.blue, fontWeight: 700, cursor: "pointer",
                  textDecoration: "underline", fontFamily: "inherit", fontSize: 13
                }}>Profile tab</button>{" "}
                before applying for a passport — we will use that photo on your passport.
              </div>
            )}

            {Object.keys(groupedServices).length === 0 && (
              <div style={{
                padding: 40, textAlign: "center", background: "#fff",
                border: `1px solid ${COLORS.border}`, borderRadius: 12,
                color: COLORS.textMuted, fontSize: 13
              }}>No passport services are currently available.</div>
            )}

            {["first_time", "renewal", "replacement"].map(appType => {
              const tiers = groupedServices[appType];
              if (!tiers) return null;
              return (
                <div key={appType} style={{ marginBottom: 40 }}>
                  <h3 style={{ margin: "0 0 4px", color: COLORS.blue, fontSize: 18 }}>
                    {APP_TYPE_LABEL[appType] || appType}
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textMuted }}>
                    Standard is cheapest — Express is fastest.
                  </p>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 18
                  }}>
                    {TIER_ORDER.filter(t => tiers[t]).map(tierKey => {
                      const list = tiers[tierKey];
                      const meta = TIER_META[tierKey] || TIER_META.standard;
                      return list.map(svc => (
                        <article key={svc.service_id} style={{
                          position: "relative", background: "#fff",
                          border: `1px solid ${COLORS.border}`,
                          borderTop: `4px solid ${meta.color}`,
                          borderRadius: 12, padding: 22,
                          display: "flex", flexDirection: "column",
                          boxShadow: "0 2px 8px rgba(0,32,159,0.05)",
                          transition: "transform 0.15s, box-shadow 0.15s"
                        }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-3px)";
                            e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,32,159,0.12)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,32,159,0.05)";
                          }}
                        >
                          <span style={{
                            position: "absolute", top: -12, left: 18,
                            background: meta.bg, color: meta.color,
                            fontSize: 10, fontWeight: 800,
                            padding: "4px 10px", borderRadius: 20,
                            letterSpacing: 0.6, textTransform: "uppercase",
                            border: `1px solid ${meta.color}22`
                          }}>{meta.label}</span>

                          <h4 style={{ margin: "10px 0 4px", fontSize: 15, color: COLORS.blue, fontWeight: 700 }}>
                            {svc.service_name}
                          </h4>

                          {meta.note && (
                            <p style={{ margin: "0 0 12px", fontSize: 11, color: meta.color, fontWeight: 600 }}>
                              {meta.note}
                            </p>
                          )}

                          <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, flexGrow: 1 }}>
                            {svc.description}
                          </p>

                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: COLORS.blue }}>
                              M {Number(svc.fee_amount).toFixed(2)}
                            </span>
                            <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>
                              · {svc.processing_days} working days
                            </span>
                          </div>

                          <div style={{
                            display: "flex", flexWrap: "wrap", gap: 8,
                            fontSize: 11, color: COLORS.textMid,
                            paddingTop: 12, borderTop: `1px solid ${COLORS.borderLight}`,
                            marginBottom: 16
                          }}>
                            {svc.requires_appointment ? <Chip>Appointment required</Chip> : null}
                            {svc.requires_biometrics ? <Chip>Biometrics</Chip> : null}
                            {svc.requires_approval ? <Chip tone="warn">Approval required</Chip> : null}
                          </div>

                          <button onClick={() => openService(svc.service_id)} style={{
                            width: "100%", padding: "11px", border: 0,
                            background: COLORS.blue, color: "#fff",
                            borderRadius: 6, fontWeight: 700, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit"
                          }}>Start application</button>
                        </article>
                      ));
                    })}
                  </div>
                </div>
              );
            })}
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
              {applications.map(a => {
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
              {notifications.map(n => (
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
            {complaints.map(c => (
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
            <h2 style={section.title}>My profile</h2>
            <p style={section.subtitle}>
              Your verified identity on the Lesotho Government Services platform.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 20 }}>
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.blue} 0%, #001a80 100%)`,
                color: "#fff", borderRadius: 12, padding: 22,
                aspectRatio: "85/54", maxWidth: 480,
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
                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 24, marginBottom: 20
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

                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 24
                }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 14, color: COLORS.blue }}>
                    Identity photo
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: COLORS.textMuted }}>
                    This photo appears on your ID and will be used on your passport.
                  </p>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{
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
        <Overlay onClose={closeService}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>{activeService.service_name}</h2>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.textMuted }}>
            {activeService.description}
          </p>

          <div style={{
            display: "flex", gap: 16, flexWrap: "wrap",
            padding: "10px 14px", background: COLORS.blueLight,
            borderRadius: 8, marginBottom: 18, fontSize: 12,
            color: COLORS.textMid, fontWeight: 600
          }}>
            <span>
              Tier:{" "}
              <strong style={{ color: TIER_META[activeService.processing_tier]?.color }}>
                {TIER_META[activeService.processing_tier]?.label || activeService.processing_tier}
              </strong>
            </span>
            <span>Fee: <strong>M {Number(activeService.fee_amount).toFixed(2)}</strong></span>
            <span>Processing: <strong>{activeService.processing_days} working days</strong></span>
          </div>

          <form onSubmit={submit}>
            {/* Passport photo — read-only, taken from profile */}
            <div style={{
              padding: 14,
              background: me?.photo_url ? "#ecfdf3" : "#fff8e1",
              border: `1px solid ${me?.photo_url ? "#06764755" : "#b4530955"}`,
              borderRadius: 8, marginBottom: 20
            }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: COLORS.textDark, marginBottom: 4 }}>
                Passport photo
              </label>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                We will use the photo from your National ID / Profile. You don't need to upload it again.
              </p>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  width: 100, height: 128, borderRadius: 6,
                  border: `1px dashed ${COLORS.border}`,
                  background: "#fff",
                  display: "grid", placeItems: "center", overflow: "hidden"
                }}>
                  {me?.photo_url ? (
                    <img src={me.photo_url} alt="ID photo"
                      crossOrigin="anonymous"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 11, color: COLORS.textMuted, padding: 8, textAlign: "center" }}>
                      No ID photo on file
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  {!me?.photo_url && (
                    <button
                      type="button"
                      onClick={() => { closeService(); setTab("profile"); }}
                      style={{
                        display: "inline-block", padding: "10px 18px",
                        background: COLORS.blue, color: "#fff",
                        borderRadius: 6, fontSize: 13, fontWeight: 700,
                        cursor: "pointer", border: 0, fontFamily: "inherit"
                      }}
                    >
                      Upload ID photo on Profile
                    </button>
                  )}
                  {me?.photo_url && (
                    <p style={{ margin: 0, fontSize: 12, color: "#067647", fontWeight: 600 }}>
                      ✓ Photo ready — taken from your profile
                    </p>
                  )}
                </div>
              </div>
            </div>

            {fields.map(f => (
              <Field
                key={f.field_key}
                field={f}
                value={values[f.field_key] || ""}
                onChange={v => setValues(p => ({ ...p, [f.field_key]: v }))}
              />
            ))}

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

            {submitError && (
              <p style={{
                color: COLORS.error, fontSize: 13,
                padding: 10, background: "#fdecea", borderRadius: 6
              }}>{submitError}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={closeService} style={btnOutline}>Cancel</button>
              <button
                type="submit"
                disabled={submitting || !me?.photo_url}
                style={{
                  ...btnPrimary,
                  opacity: (submitting || !me?.photo_url) ? 0.55 : 1,
                  cursor: (submitting || !me?.photo_url) ? "not-allowed" : "pointer"
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
                    <a href={`${API_BASE.replace("/api", "")}${d.storage_path}`}
                       target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
                      {d.original_filename}
                    </a>
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

// ============================================================
// SUB-COMPONENTS
// ============================================================
function StatCard({ label, value, accent }) {
  return (
    <article style={{
      background: "#fff", border: `1px solid ${COLORS.border}`,
      borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: "18px 22px"
    }}>
      <p style={{
        margin: "0 0 6px", fontSize: 11, textTransform: "uppercase",
        letterSpacing: 0.6, color: COLORS.textMuted, fontWeight: 700
      }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: accent }}>{value}</p>
    </article>
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

function Chip({ children, tone }) {
  const colors = tone === "warn"
    ? { bg: "#fff4df", fg: "#b45309" }
    : { bg: "#eff8ff", fg: "#175cd3" };
  return (
    <span style={{
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
    <span style={{
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
function usePdfDownload() {
  const ref = useRef(null);
  const [downloading, setDownloading] = useState(false);
  async function download(filename) {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true, allowTaint: true
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px", format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(filename);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Could not generate PDF.");
    } finally { setDownloading(false); }
  }
  return { ref, download, downloading };
}

function PassportView({ data, onClose }) {
  const { ref, download, downloading } = usePdfDownload();
  const { application, data: fields, passport } = data;

  const photoSrc =
    application.passport_photo_url || application.photo_url;

  return (
    <div>
      <div ref={ref} style={{
        background: "#f8fafc",
        border: `2px solid ${COLORS.blue}`,
        borderRadius: 10, padding: 28,
        maxWidth: 640, margin: "0 auto"
      }}>
        <div style={{
          textAlign: "center", borderBottom: `2px solid ${COLORS.blue}`,
          paddingBottom: 14, marginBottom: 18
        }}>
          <p style={{
            margin: 0, fontSize: 11, letterSpacing: 2,
            textTransform: "uppercase", color: COLORS.blue
          }}>Kingdom of Lesotho</p>
          <h2 style={{ margin: "6px 0 0", fontSize: 22, color: COLORS.blue, fontWeight: 700 }}>
            Passport
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
            Ministry of Home Affairs · Department of Passport Services
          </p>
        </div>

        {photoSrc && (
          <div style={{
            width: 110, height: 140, margin: "0 auto 20px",
            border: `1px solid ${COLORS.border}`, overflow: "hidden"
          }}>
            <img src={photoSrc} alt="Holder"
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, color: COLORS.textMuted }}>
            PASSPORT NUMBER
          </p>
          <p style={{
            margin: "6px 0 0", fontSize: 24, fontWeight: 700,
            letterSpacing: 2, fontFamily: "Consolas, monospace",
            color: COLORS.blue
          }}>
            {passport?.passport_number || "PENDING"}
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 16, marginBottom: 20
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
          textAlign: "center", paddingTop: 16,
          borderTop: `1px solid ${COLORS.borderLight}`,
          fontSize: 11, color: COLORS.textMuted
        }}>
          This passport is the property of the Kingdom of Lesotho.<br />
          Reference: {application.reference_number}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
        <button
          onClick={() => download(`Passport-${application.reference_number}.pdf`)}
          disabled={downloading}
          style={{ ...btnPrimary, marginLeft: 10 }}
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p style={{
        margin: 0, fontSize: 10, color: COLORS.textMuted,
        textTransform: "uppercase", letterSpacing: 0.6
      }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textDark, fontWeight: 600 }}>
        {value}
      </p>
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

export default PassportOfficeDashboard;
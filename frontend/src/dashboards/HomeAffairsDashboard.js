import React, { useEffect, useState, useCallback, useRef } from "react";
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

const MODULES = [
  { key: "NICR", label: "Civil Registration", desc: "Births, deaths, marriages, IDs" },
  { key: "IMMIGRATION", label: "Immigration", desc: "Visas, permits, citizenship" },
  { key: "LRMIS", label: "Livestock", desc: "Owner and animal registration" }
];

function HomeAffairsDashboard() {
  const [tab, setTab] = useState("apply");
  const [me, setMe] = useState(null);
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeModule, setActiveModule] = useState("NICR");

  const [activeService, setActiveService] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedApp, setSelectedApp] = useState(null);
  const [detail, setDetail] = useState(null);

  const [certificate, setCertificate] = useState(null);

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [meRes, svcRes, appsRes, notifRes] = await Promise.all([
        api("/me"),
        api("/services"),
        api("/applications/my"),
        api("/notifications")
      ]);
      setMe(meRes.user);
      setServices(svcRes.services || []);
      setApplications(appsRes.applications || []);
      setNotifications(notifRes.notifications || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openService(serviceId) {
    setSubmitError("");
    setValues({});
    setFiles({});
    try {
      const data = await api(`/services/${serviceId}`);
      setActiveService(data.service);
      setFields(data.fields);
    } catch (err) { alert(err.message); }
  }

  function closeService() {
    setActiveService(null);
    setFields([]);
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("serviceId", activeService.service_id);
      fd.append("fields", JSON.stringify(values));
      for (const [k, f] of Object.entries(files)) {
        if (f && f instanceof File) fd.append("documents", f, `${k}__${f.name}`);
      }
      const res = await api("/applications", { method: "POST", body: fd });
      closeService();
      await load();
      alert(`Submitted. Reference: ${res.referenceNumber}`);
    } catch (err) { setSubmitError(err.message); }
    finally { setSubmitting(false); }
  }

  async function openDetail(id) {
    try {
      const data = await api(`/applications/${id}`);
      setSelectedApp(data.application);
      setDetail(data);
    } catch (err) { alert(err.message); }
  }

  async function viewCertificate(id) {
    try {
      const data = await api(`/certificates/${id}`);
      setCertificate(data);
    } catch (err) { alert(err.message); }
  }

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n =>
        n.notification_id === id ? { ...n, read_at: new Date().toISOString() } : n
      ));
    } catch (err) { console.error(err); }
  }

  // ------------------------------------------------------------
  // Photo upload
  // ------------------------------------------------------------
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");

    // Client-side validation
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

  const visibleServices = services.filter(s => s.module === activeModule);
  const unread = notifications.filter(n => !n.read_at).length;
  const activeApps = applications.filter(a =>
    ["submitted", "under_review", "more_information_required", "awaiting_payment"].includes(a.status)
  ).length;
  const readyApps = applications.filter(a =>
    ["approved", "ready_for_collection", "completed"].includes(a.status)
  ).length;

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={header.content}>
            <p style={header.eyebrow}>Department of Home Affairs</p>
            <h1 style={header.title}>Welcome, {me?.full_name || "citizen"}</h1>
            {me && (
              <p style={header.subtitle}>
                National ID: <strong>{me.national_id_number || me.national_id || "—"}</strong>
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
          borderBottom: `1px solid ${COLORS.border}`
        }}>
          {[
            ["apply", "Apply"],
            ["mine", `My applications (${applications.length})`],
            ["notifications", `Notifications${unread ? ` (${unread})` : ""}`],
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
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12, marginBottom: 24
            }}>
              {MODULES.map(m => (
                <button key={m.key} onClick={() => setActiveModule(m.key)} style={{
                  textAlign: "left", padding: "16px 18px",
                  border: `1px solid ${activeModule === m.key ? COLORS.blue : COLORS.border}`,
                  background: activeModule === m.key ? COLORS.blue : "#fff",
                  color: activeModule === m.key ? "#fff" : COLORS.textDark,
                  borderRadius: 10, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s"
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{m.label}</div>
                  <div style={{
                    fontSize: 12, marginTop: 4,
                    opacity: activeModule === m.key ? 0.85 : 0.65
                  }}>{m.desc}</div>
                </button>
              ))}
            </div>

            <section style={section.wrapper}>
              <h2 style={section.title}>Available services</h2>
              <p style={section.subtitle}>Select a service to start an application.</p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 18
              }}>
                {visibleServices.map(svc => (
                  <article key={svc.service_id} style={{
                    background: "#fff",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 22,
                    boxShadow: "0 2px 8px rgba(0,32,159,0.05)",
                    display: "flex", flexDirection: "column",
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
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", marginBottom: 12
                    }}>
                      <h3 style={{
                        margin: 0, fontSize: 15,
                        color: COLORS.blue, fontWeight: 700
                      }}>{svc.service_name}</h3>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: "3px 8px", borderRadius: 4,
                        background: COLORS.blueLight, color: COLORS.blue,
                        textTransform: "uppercase", letterSpacing: 0.5
                      }}>{svc.module}</span>
                    </div>
                    <p style={{
                      margin: "0 0 16px", fontSize: 13,
                      color: COLORS.textMuted, lineHeight: 1.5, flexGrow: 1
                    }}>{svc.description}</p>
                    <div style={{
                      display: "flex", gap: 16, paddingTop: 14,
                      borderTop: `1px solid ${COLORS.borderLight}`,
                      fontSize: 12, color: COLORS.textMid, marginBottom: 16
                    }}>
                      <span><strong>{svc.processing_days}</strong> days</span>
                      {svc.requires_payment ? <span>Fee applies</span> : <span>Free</span>}
                      {svc.requires_appointment ? <span>Appointment</span> : null}
                    </div>
                    <button onClick={() => openService(svc.service_id)} style={{
                      width: "100%", padding: "11px", border: 0,
                      background: COLORS.blue, color: "#fff",
                      borderRadius: 6, fontWeight: 700, fontSize: 13,
                      cursor: "pointer", fontFamily: "inherit"
                    }}>Start application</button>
                  </article>
                ))}
                {visibleServices.length === 0 && (
                  <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                    No services in this module.
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        {tab === "mine" && (
          <section>
            <h2 style={section.title}>My applications</h2>
            <p style={section.subtitle}>Track every request you've submitted.</p>

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
                }}>You have no applications yet.</div>
              )}
              {applications.map(a => (
                <article key={a.application_id} style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 20,
                  boxShadow: "0 2px 8px rgba(0,32,159,0.05)"
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 12
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: COLORS.blue,
                      fontFamily: "Consolas, monospace", letterSpacing: 0.5
                    }}>{a.reference_number}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <h3 style={{
                    margin: "0 0 6px", fontSize: 15, color: COLORS.textDark
                  }}>{a.service_type}</h3>
                  <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.textMuted }}>
                    {a.module} · Submitted {new Date(a.submitted_at).toLocaleDateString()}
                  </p>
                  {a.decision_notes && (
                    <p style={{
                      margin: "0 0 14px", padding: 10,
                      background: COLORS.blueLight, borderRadius: 6,
                      fontSize: 12, color: COLORS.textMid, lineHeight: 1.5
                    }}>
                      <strong>Officer note:</strong> {a.decision_notes}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button onClick={() => openDetail(a.application_id)} style={btnOutline}>
                      View details
                    </button>
                    {["approved", "ready_for_collection", "completed"].includes(a.status) && (
                      <button onClick={() => viewCertificate(a.application_id)} style={btnPrimary}>
                        Certificate
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "notifications" && (
          <section>
            <h2 style={section.title}>Notifications</h2>
            <p style={section.subtitle}>Updates on your applications.</p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12
            }}>
              {notifications.length === 0 && (
                <div style={{
                  gridColumn: "1 / -1", padding: 40, textAlign: "center",
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, color: COLORS.textMuted, fontSize: 13
                }}>No notifications yet.</div>
              )}
              {notifications.map(n => (
                <article key={n.notification_id} style={{
                  background: n.read_at ? "#fff" : COLORS.blueLight,
                  border: `1px solid ${n.read_at ? COLORS.border : COLORS.blue}`,
                  borderRadius: 10, padding: 16
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: 12
                  }}>
                    <strong style={{ fontSize: 13, color: COLORS.textDark }}>{n.title}</strong>
                    <small style={{
                      color: COLORS.textMuted, fontSize: 11, whiteSpace: "nowrap"
                    }}>{new Date(n.created_at).toLocaleString()}</small>
                  </div>
                  <p style={{
                    margin: "8px 0 0", fontSize: 13,
                    color: COLORS.textMid, lineHeight: 1.55
                  }}>{n.message}</p>
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

        {tab === "profile" && me && (
          <section>
            <h2 style={section.title}>My profile</h2>
            <p style={section.subtitle}>
              Your verified identity on the Lesotho Government Services platform.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
              gap: 20
            }}>
              {/* ID CARD WITH PHOTO */}
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.blue} 0%, #001a80 100%)`,
                color: "#fff", borderRadius: 12, padding: 22,
                aspectRatio: "85/54", maxWidth: 480,
                display: "flex", flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 12px 28px rgba(0,32,159,0.25)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{
                      margin: 0, fontSize: 9, letterSpacing: 1.6,
                      textTransform: "uppercase", opacity: 0.85
                    }}>Kingdom of Lesotho</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700 }}>
                      National Identity Card
                    </p>
                  </div>

                  {/* PHOTO on ID */}
                  <div style={{
                    width: 72, height: 92, borderRadius: 4,
                    background: "rgba(255,255,255,0.12)",
                    display: "grid", placeItems: "center",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.2)"
                  }}>
                    {me.photo_url ? (
                      <img
                        src={me.photo_url}
                        alt="ID"
                        style={{
                          width: "100%", height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 700 }}>NO PHOTO</span>
                    )}
                  </div>
                </div>

                <div>
                  <p style={{
                    margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1
                  }}>ID NUMBER</p>
                  <p style={{
                    margin: "2px 0 10px", fontSize: 16, fontWeight: 700,
                    letterSpacing: 1.4, fontFamily: "Consolas, monospace"
                  }}>{me.national_id_number || me.national_id || "—"}</p>

                  <p style={{
                    margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1
                  }}>NAME</p>
                  <p style={{ margin: "2px 0 10px", fontSize: 13, fontWeight: 600 }}>
                    {me.full_name}
                  </p>

                  <div style={{ display: "flex", gap: 20 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 8, opacity: 0.7, letterSpacing: 1 }}>
                        NATIONALITY
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11 }}>Mosotho</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 8, opacity: 0.7, letterSpacing: 1 }}>
                        ROLE
                      </p>
                      <p style={{
                        margin: "2px 0 0", fontSize: 11, textTransform: "capitalize"
                      }}>{me.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILS + PHOTO UPLOAD */}
              <div>
                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 24, marginBottom: 20
                }}>
                  <h3 style={{
                    margin: "0 0 16px", fontSize: 14,
                    color: COLORS.blue, fontWeight: 700
                  }}>Profile details</h3>
                  <ProfileRow label="Full name" value={me.full_name} />
                  <ProfileRow label="Email" value={me.email || "—"} />
                  <ProfileRow label="Phone" value={me.phone || "—"} />
                  <ProfileRow label="National ID" value={me.national_id_number || me.national_id || "—"} />
                  <ProfileRow label="Account type" value={me.account_type} />
                  <ProfileRow label="Account status" value={me.account_status} />
                  <ProfileRow label="Member since" value={new Date(me.created_at).toLocaleDateString()} />
                </div>

                {/* PHOTO UPLOAD CARD */}
                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 24
                }}>
                  <h3 style={{
                    margin: "0 0 6px", fontSize: 14,
                    color: COLORS.blue, fontWeight: 700
                  }}>Identity photo</h3>
                  <p style={{
                    margin: "0 0 16px", fontSize: 12,
                    color: COLORS.textMuted, lineHeight: 1.5
                  }}>
                    Upload a clear, front-facing photo of yourself. This photo will
                    appear on your National ID and any printed certificates.
                  </p>

                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{
                      width: 90, height: 116, borderRadius: 6,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.lightBg,
                      display: "grid", placeItems: "center",
                      overflow: "hidden"
                    }}>
                      {me.photo_url ? (
                        <img src={me.photo_url} alt="My photo"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{
                          fontSize: 10, color: COLORS.textMuted, textAlign: "center", padding: 6
                        }}>No photo yet</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handlePhotoUpload}
                        style={{ display: "none" }}
                        id="photo-upload-input"
                      />
                      <label
                        htmlFor="photo-upload-input"
                        style={{
                          display: "inline-block",
                          padding: "11px 20px",
                          background: COLORS.blue,
                          color: "#fff",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: photoUploading ? "wait" : "pointer",
                          opacity: photoUploading ? 0.6 : 1
                        }}
                      >
                        {photoUploading ? "Uploading…" :
                         me.photo_url ? "Replace photo" : "Upload photo"}
                      </label>
                      <p style={{
                        margin: "8px 0 0", fontSize: 11, color: COLORS.textMuted
                      }}>
                        JPG or PNG · max 5 MB · recommended 300 × 400 px
                      </p>
                      {photoError && (
                        <p style={{
                          margin: "8px 0 0", fontSize: 12, color: COLORS.error
                        }}>{photoError}</p>
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
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {activeService.service_name}
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.textMuted }}>
            {activeService.description}
          </p>
          <form onSubmit={submit}>
            {fields.map(f => (
              <Field
                key={f.field_key}
                field={f}
                value={values[f.field_key] || ""}
                onChange={v => setValues(p => ({ ...p, [f.field_key]: v }))}
                onFile={file => setFiles(p => ({ ...p, [f.field_key]: file }))}
              />
            ))}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6
              }}>Additional documents</label>
              <input type="file" multiple onChange={e => {
                const arr = Array.from(e.target.files || []);
                setFiles(p => ({ ...p, __extra: arr }));
              }} />
            </div>
            {submitError && <p style={{ color: COLORS.error, fontSize: 13 }}>{submitError}</p>}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              gap: 10, marginTop: 16
            }}>
              <button type="button" onClick={closeService} style={btnOutline}>Cancel</button>
              <button type="submit" disabled={submitting} style={btnPrimary}>
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
            {selectedApp.service_type} · {selectedApp.module}
          </p>
          <ProfileRow label="Status" value={selectedApp.status.replace(/_/g, " ")} />
          <ProfileRow label="Submitted" value={new Date(selectedApp.submitted_at).toLocaleString()} />
          {selectedApp.decision_notes && (
            <ProfileRow label="Officer note" value={selectedApp.decision_notes} />
          )}
          <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>
            Submitted information
          </h3>
          {detail.values?.length === 0 && <p style={{ fontSize: 13 }}>None</p>}
          {detail.values?.map(v => (
            <ProfileRow key={v.field_key}
              label={v.field_key.replace(/_/g, " ")}
              value={v.field_value} />
          ))}
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
          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button onClick={() => { setSelectedApp(null); setDetail(null); }} style={btnPrimary}>
              Close
            </button>
          </div>
        </Overlay>
      )}

      {certificate && (
        <Overlay onClose={() => setCertificate(null)}>
          <CertificateView data={certificate} onClose={() => setCertificate(null)} />
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

function ProfileRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "8px 0", borderBottom: `1px solid ${COLORS.borderLight}`,
      fontSize: 13
    }}>
      <span style={{ color: COLORS.textMuted, textTransform: "capitalize" }}>{label}</span>
      <span style={{
        color: COLORS.textDark, fontWeight: 600, textAlign: "right"
      }}>{value}</span>
    </div>
  );
}

function Field({ field, value, onChange, onFile }) {
  const common = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${COLORS.border}`, borderRadius: 6,
    fontSize: 13, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box"
  };
  let input;
  if (field.field_type === "textarea") {
    input = <textarea value={value} onChange={e => onChange(e.target.value)}
      required={field.required} rows={3} style={common} />;
  } else if (field.field_type === "select") {
    input = (
      <select value={value} onChange={e => onChange(e.target.value)}
        required={field.required} style={common}>
        <option value="">Select…</option>
        {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else {
    input = <input type={field.field_type} value={value}
      onChange={e => onChange(e.target.value)}
      required={field.required} style={common}
      placeholder={field.placeholder || ""} />;
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
      }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    submitted: { bg: "#eff8ff", fg: "#175cd3" },
    under_review: { bg: "#fff4df", fg: "#b45309" },
    more_information_required: { bg: "#fff4df", fg: "#b45309" },
    awaiting_payment: { bg: "#fff4df", fg: "#b45309" },
    payment_verified: { bg: "#ecfdf3", fg: "#067647" },
    approved: { bg: "#ecfdf3", fg: "#067647" },
    ready_for_collection: { bg: "#ecfdf3", fg: "#067647" },
    completed: { bg: "#ecfdf3", fg: "#067647" },
    rejected: { bg: "#fdecea", fg: "#b3261e" },
    cancelled: { bg: "#f1f5f9", fg: "#475569" }
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
// CERTIFICATES WITH PHOTO + PDF
// ============================================================
function CertificateView({ data, onClose }) {
  const { application, data: fields } = data;
  const t = (application.service_type || "").toLowerCase();

  if (application.module === "NICR" && t.includes("national id")) {
    return <NationalIDCard application={application} fields={fields} onClose={onClose} />;
  }
  if (application.module === "NICR") {
    return <CivilCertificate application={application} fields={fields} onClose={onClose} />;
  }
  if (application.module === "IMMIGRATION") {
    return <ImmigrationPermit application={application} fields={fields} onClose={onClose} />;
  }
  if (application.module === "LRMIS") {
    return <LivestockCertificate application={application} fields={fields} onClose={onClose} />;
  }
  return <GenericCertificate application={application} fields={fields} onClose={onClose} />;
}

function usePdfDownload() {
  const ref = useRef(null);
  const [downloading, setDownloading] = useState(false);

  async function download(filename) {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(filename);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return { ref, download, downloading };
}

function NationalIDCard({ application, fields, onClose }) {
  const { ref, download, downloading } = usePdfDownload();

  return (
    <div>
      <div ref={ref} style={{
        background: `linear-gradient(135deg, ${COLORS.blue}, #001a80)`,
        color: "#fff", borderRadius: 10, padding: 24,
        aspectRatio: "85/54", maxWidth: 520, margin: "0 auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{
              margin: 0, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase"
            }}>Kingdom of Lesotho</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700 }}>
              National Identity Card
            </p>
          </div>
          <div style={{
            width: 72, height: 92, borderRadius: 4,
            background: "rgba(255,255,255,0.12)",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "grid", placeItems: "center"
          }}>
            {application.photo_url ? (
              <img src={application.photo_url} alt="ID"
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 9, fontWeight: 700 }}>NO PHOTO</span>
            )}
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: 0, fontSize: 10, opacity: 0.75 }}>ID NUMBER</p>
          <p style={{
            margin: "2px 0 12px", fontSize: 18, fontWeight: 700,
            letterSpacing: 1.4, fontFamily: "Consolas, monospace"
          }}>{application.national_id || "—"}</p>
          <p style={{ margin: 0, fontSize: 10, opacity: 0.75 }}>NAME</p>
          <p style={{ margin: "2px 0 12px", fontSize: 14, fontWeight: 600 }}>
            {application.full_name}
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, opacity: 0.75 }}>DATE OF BIRTH</p>
              <p style={{ margin: "2px 0 0", fontSize: 12 }}>
                {fields.date_of_birth || "—"}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 9, opacity: 0.75 }}>NATIONALITY</p>
              <p style={{ margin: "2px 0 0", fontSize: 12 }}>Mosotho</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 9, opacity: 0.75 }}>SEX</p>
              <p style={{ margin: "2px 0 0", fontSize: 12 }}>{fields.gender || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
        <button
          onClick={() => download(`National-ID-${application.reference_number}.pdf`)}
          disabled={downloading}
          style={{ ...btnPrimary, marginLeft: 10 }}
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

function CivilCertificate({ application, fields, onClose }) {
  const { ref, download, downloading } = usePdfDownload();
  const t = (application.service_type || "").toLowerCase();
  const isDeath = t.includes("death");
  const isMarriage = t.includes("marriage");

  const title = isDeath ? "Death Certificate"
    : isMarriage ? "Marriage Certificate"
    : "Birth Certificate";

  const subjectName =
    fields.child_first_name
      ? `${fields.child_first_name} ${fields.child_middle_name || ""} ${fields.child_last_name || ""}`.trim()
    : fields.deceased_full_name || fields.certificate_holder_name || application.full_name;

  return (
    <div>
      <div ref={ref} style={{
        background: "#fdf8ec", border: `2px solid ${COLORS.blue}`,
        borderRadius: 10, padding: 32, maxWidth: 620, margin: "0 auto"
      }}>
        <div style={{
          textAlign: "center", borderBottom: `2px solid ${COLORS.blue}`,
          paddingBottom: 16, marginBottom: 20
        }}>
          <p style={{
            margin: 0, fontSize: 11, letterSpacing: 2,
            textTransform: "uppercase", color: COLORS.blue
          }}>Kingdom of Lesotho</p>
          <h2 style={{
            margin: "6px 0 0", fontSize: 22,
            color: COLORS.blue, fontWeight: 700
          }}>{title}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
            Issued by the Ministry of Home Affairs
          </p>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
          {/* PHOTO on certificate */}
          {application.photo_url && (
            <div style={{
              width: 100, height: 128, borderRadius: 4,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden", flexShrink: 0
            }}>
              <img src={application.photo_url} alt="Holder"
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textMuted }}>
              <strong>Certificate No:</strong> {application.reference_number}
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: COLORS.textMuted }}>
              <strong>Issued on:</strong> {new Date().toLocaleDateString()}
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.7, margin: "0 0 16px" }}>
              This is to certify that the record of
            </p>
            <p style={{
              fontSize: 18, fontWeight: 700, color: COLORS.blue,
              margin: "0 0 16px"
            }}>{subjectName}</p>
          </div>
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
          is duly registered in the records of the Ministry of Home Affairs,
          Kingdom of Lesotho, in accordance with the laws of the Kingdom.
        </p>

        {Object.entries(fields)
          .filter(([k, v]) => v && !k.startsWith("_"))
          .slice(0, 8)
          .map(([k, v]) => (
            <p key={k} style={{ margin: "0 0 6px", fontSize: 13 }}>
              <strong style={{ textTransform: "capitalize" }}>
                {k.replace(/_/g, " ")}
              </strong>: {String(v)}
            </p>
          ))}

        <div style={{
          marginTop: 36, display: "flex",
          justifyContent: "space-between", alignItems: "flex-end"
        }}>
          <div>
            <div style={{
              borderTop: `1px solid ${COLORS.textDark}`,
              width: 180, paddingTop: 4
            }}>
              <p style={{ margin: 0, fontSize: 11 }}>Registrar's Signature</p>
            </div>
          </div>
          <div style={{
            width: 60, height: 60, border: `1px dashed ${COLORS.textMuted}`,
            borderRadius: "50%", display: "grid", placeItems: "center",
            fontSize: 8, color: COLORS.textMuted, textAlign: "center"
          }}>OFFICIAL<br />SEAL</div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
        <button
          onClick={() => download(`Certificate-${application.reference_number}.pdf`)}
          disabled={downloading}
          style={{ ...btnPrimary, marginLeft: 10 }}
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

function ImmigrationPermit({ application, fields, onClose }) {
  const { ref, download, downloading } = usePdfDownload();
  return (
    <div>
      <div ref={ref} style={{
        border: `2px solid ${COLORS.green}`, borderRadius: 10, padding: 32,
        maxWidth: 620, margin: "0 auto", background: "#f8fdf9"
      }}>
        <div style={{
          textAlign: "center", borderBottom: `2px solid ${COLORS.green}`,
          paddingBottom: 16, marginBottom: 20
        }}>
          <p style={{
            margin: 0, fontSize: 11, letterSpacing: 2,
            textTransform: "uppercase", color: COLORS.green
          }}>Kingdom of Lesotho</p>
          <h2 style={{ margin: "6px 0 0", fontSize: 22, color: COLORS.green }}>
            Immigration Permit
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
            Department of Immigration
          </p>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
          {application.photo_url && (
            <div style={{
              width: 100, height: 128, borderRadius: 4,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden", flexShrink: 0
            }}>
              <img src={application.photo_url} alt="Holder"
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: COLORS.textMuted }}>
              <strong>Permit No:</strong> {application.reference_number}
            </p>
            <p style={{ fontSize: 12, color: COLORS.textMuted }}>
              <strong>Holder:</strong> {application.full_name}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {Object.entries(fields)
            .filter(([k, v]) => v && !k.startsWith("_"))
            .map(([k, v]) => (
              <p key={k} style={{ margin: "0 0 6px", fontSize: 13 }}>
                <strong style={{ textTransform: "capitalize" }}>
                  {k.replace(/_/g, " ")}
                </strong>: {String(v)}
              </p>
            ))}
        </div>
        <p style={{ marginTop: 24, fontSize: 12, color: COLORS.textMuted }}>
          Issued on {new Date().toLocaleDateString()} · Valid subject to the conditions of the permit.
        </p>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
        <button
          onClick={() => download(`Permit-${application.reference_number}.pdf`)}
          disabled={downloading}
          style={{ ...btnPrimary, marginLeft: 10 }}
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

function LivestockCertificate({ application, fields, onClose }) {
  const { ref, download, downloading } = usePdfDownload();
  return (
    <div>
      <div ref={ref} style={{
        border: `2px solid ${COLORS.blue}`, borderRadius: 10, padding: 32,
        maxWidth: 620, margin: "0 auto"
      }}>
        <h2 style={{ margin: 0, color: COLORS.blue, textAlign: "center" }}>
          Livestock Registration Certificate
        </h2>
        <p style={{ textAlign: "center", fontSize: 11, color: COLORS.textMuted }}>
          Ministry of Home Affairs · LRMIS
        </p>

        <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
          {application.photo_url && (
            <div style={{
              width: 90, height: 116, borderRadius: 4,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden", flexShrink: 0
            }}>
              <img src={application.photo_url} alt="Owner"
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13 }}>
              <strong>Reference:</strong> {application.reference_number}
            </p>
            <p style={{ fontSize: 13 }}>
              <strong>Owner:</strong> {application.full_name}
            </p>
          </div>
        </div>

        {Object.entries(fields)
          .filter(([k, v]) => v && !k.startsWith("_"))
          .map(([k, v]) => (
            <p key={k} style={{ margin: "0 0 6px", fontSize: 13 }}>
              <strong style={{ textTransform: "capitalize" }}>
                {k.replace(/_/g, " ")}
              </strong>: {String(v)}
            </p>
          ))}
        <p style={{ marginTop: 20, fontSize: 12, color: COLORS.textMuted }}>
          Issued on {new Date().toLocaleDateString()}
        </p>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
        <button
          onClick={() => download(`Livestock-${application.reference_number}.pdf`)}
          disabled={downloading}
          style={{ ...btnPrimary, marginLeft: 10 }}
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

function GenericCertificate({ application, fields, onClose }) {
  const { ref, download, downloading } = usePdfDownload();
  return (
    <div>
      <div ref={ref}>
        <h2 style={{ margin: 0, color: COLORS.blue }}>{application.service_type}</h2>
        <p style={{ margin: "4px 0 20px", fontSize: 13, color: COLORS.textMuted }}>
          Reference: {application.reference_number}
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          {application.photo_url && (
            <div style={{
              width: 90, height: 116, borderRadius: 4,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden", flexShrink: 0
            }}>
              <img src={application.photo_url} alt="Holder"
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div>
            <p style={{ fontSize: 13, margin: 0 }}>
              <strong>Issued to:</strong> {application.full_name}
            </p>
          </div>
        </div>
        {Object.entries(fields)
          .filter(([k, v]) => v && !k.startsWith("_"))
          .map(([k, v]) => (
            <p key={k} style={{ margin: "0 0 6px", fontSize: 13 }}>
              <strong style={{ textTransform: "capitalize" }}>
                {k.replace(/_/g, " ")}
              </strong>: {String(v)}
            </p>
          ))}
      </div>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
        <button
          onClick={() => download(`Document-${application.reference_number}.pdf`)}
          disabled={downloading}
          style={{ ...btnPrimary, marginLeft: 10 }}
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
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

export default HomeAffairsDashboard;
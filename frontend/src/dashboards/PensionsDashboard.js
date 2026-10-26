import React, { useEffect, useState, useCallback } from "react";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import Navbar from "../components/Navbar";
import DashboardSearch, { matchesDashboardSearch } from "../components/DashboardSearch";
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

function PensionsDashboard({ onLogout }) {
  const [tab, setTab] = useState("apply");
  const [searchQuery, setSearchQuery] = useState("");
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState({
    member: null, programme: null, contributions_summary: null,
    identity: null, eligibility: null
  });
  const [applications, setApplications] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const [paymentDestination, setPaymentDestination] = useState("");
  const [savingPaymentDestination, setSavingPaymentDestination] = useState(false);
  const [regMsg, setRegMsg] = useState("");

  const [enquiryForm, setEnquiryForm] = useState({
    enquiry_type: "DELAYED_PAYMENT",
    subject: "",
    description: ""
  });
  const [enquiryMsg, setEnquiryMsg] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [
        meRes, profileRes, appsRes, contribRes,
        payRes, enqRes, notifRes
      ] = await Promise.all([
        api("/me"),
        api("/pensions/me"),
        api("/pensions/applications/my"),
        api("/pensions/contributions/my"),
        api("/pensions/payments/my"),
        api("/pensions/enquiries/my"),
        api("/pensions/notifications")
      ]);
      setMe(meRes.user);
      setProfile({
        member: profileRes.member,
        programme: profileRes.programme,
        contributions_summary: profileRes.contributions_summary,
        identity: profileRes.identity,
        eligibility: profileRes.eligibility
      });
      setPaymentDestination(
        profileRes.member?.payment_destination || profileRes.identity?.payment_phone || ""
      );
      setApplications(appsRes.applications || []);
      setContributions(contribRes.contributions || []);
      setPayments(payRes.payments || []);
      setEnquiries(enqRes.enquiries || []);
      setNotifications(notifRes.notifications || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refreshProfile = () => load();
    window.addEventListener("home-affairs-profile-updated", refreshProfile);
    return () => window.removeEventListener("home-affairs-profile-updated", refreshProfile);
  }, [load]);

  async function submitRegistration(e) {
    e.preventDefault();
    setRegMsg("");
    try {
      const res = await api("/pensions/register", {
        method: "POST",
        body: JSON.stringify({ payment_destination: paymentDestination })
      });
      setRegMsg(`Registration submitted. Reference: ${res.referenceNumber}`);
      await load();
    } catch (err) {
      setRegMsg(err.message);
    }
  }

  async function savePaymentDestination(e) {
    e.preventDefault();
    setRegMsg("");
    setSavingPaymentDestination(true);
    try {
      await api("/pensions/me/payment-destination", {
        method: "POST",
        body: JSON.stringify({ payment_destination: paymentDestination })
      });
      setRegMsg("Payment number saved.");
      await load();
    } catch (err) {
      setRegMsg(err.message);
    } finally {
      setSavingPaymentDestination(false);
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

  const deletableStatuses = ["DRAFT","SUBMITTED","MORE_INFORMATION_REQUIRED"];

  return (
    <main className="dashboard-page" style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={{
            ...header.content,
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 24, flexWrap: "wrap"
          }}>
            <div>
              <p style={header.eyebrow}>Ministry of Pensions</p>
              <h1 style={header.title}>Pensions Dashboard</h1>
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
            ["apply", "Old Age Pension"],
            ["profile", "Profile"],
            ["mine", "My applications"],
            ["contributions", "Contributions"],
            ["payments", "Payments"],
            ["enquiries", "Help and enquiries"],
            ["notifications", "Updates"]
          ]}
          activeTab={tab}
          onTabChange={setTab}
          onLogout={onLogout}
          user={me}
          sectionNavigationClassName="pensions-section-navigation"
        />

        {/* ---------------- Old Age Pension ---------------- */}
        {tab === "apply" && (
          <>
            <section style={{
              ...section.wrapper, display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 20, alignItems: "center", padding: "26px 30px",
              background: "linear-gradient(120deg, #fff 0%, #eef3ff 100%)",
              border: "1px solid " + COLORS.borderLight, borderRadius: 16
            }}>
              <div>
                <p style={header.eyebrow}>Ministry of Pensions</p>
                <h2 style={{ ...section.title, fontSize: 26 }}>Apply for the Old Age Pension</h2>
                <p style={{ ...section.subtitle, fontSize: 16, marginTop: 10 }}>
                  We check your identity and age using your Home Affairs record. You only need to confirm where payments should go.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={stepChip}><PensionIcon kind="identity" /> National ID from your profile</span>
                  <span style={stepChip}><PensionIcon kind="calendar" /> Age checked automatically</span>
                  <span style={stepChip}><PensionIcon kind="wallet" /> One payment number</span>
                </div>
              </div>
              <div aria-hidden="true" style={{ textAlign: "center" }}>
                <svg viewBox="0 0 240 170" width="100%" height="150">
                  <rect x="23" y="18" width="194" height="134" rx="20" fill="#fff" stroke="#d6def5" strokeWidth="2" />
                  <circle cx="120" cy="66" r="32" fill="#e6ebf9" />
                  <path d="M103 74c1-13 7-20 17-20s16 7 17 20M109 63c0-10 4-16 11-16s11 6 11 16" fill="none" stroke="#00209F" strokeWidth="4" strokeLinecap="round" />
                  <path d="M84 122h72M98 109h44" stroke="#009543" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="188" cy="36" r="18" fill="#009543" />
                  <path d="m180 36 5 5 11-12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </section>

            {profile.eligibility?.death_certificate_request && (
              <div role="alert" style={alertCard}>
                <PensionIcon kind="alert" />
                <div>
                  <strong>Payments are paused for verification.</strong>
                  <p style={{ margin: "5px 0 0" }}>
                    Home Affairs received a death certificate application for a person with your name. The Pensions Office must verify it before payments can continue.
                    {profile.eligibility.death_certificate_request.reference_number
                      ? " Reference: " + profile.eligibility.death_certificate_request.reference_number + "." : ""}
                  </p>
                </div>
              </div>
            )}

            <section style={{ ...section.wrapper, ...eligibilityCard }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={iconTile}><PensionIcon kind="identity" /></div>
                <div>
                  <h2 style={{ ...section.title, fontSize: 21 }}>Your eligibility</h2>
                  <p style={{ ...section.subtitle, margin: 0, fontSize: 14 }}>Checked against your Home Affairs records.</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <InfoCard label="Full name" value={profile.identity?.full_name || me?.full_name || "Loading profile"} />
                <InfoCard label="National ID" value={profile.identity?.national_id_number || me?.national_id_number || me?.national_id || "Not on profile"} />
                <InfoCard label="Age" value={profile.eligibility?.age == null ? "Add date of birth in Profile" : String(profile.eligibility.age) + " years"} />
              </div>
              {!profile.eligibility?.date_of_birth_available && !profile.member && (
                <div style={{ ...noticeCard, marginTop: 16 }}>
                  <PensionIcon kind="calendar" />
                  <div>
                    <p style={{ margin: "0 0 10px" }}>Add your date of birth in your profile to check your age. You do not need to wait for a Home Affairs approval.</p>
                    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("home-affairs-open-profile"))}
                      style={{ ...btnPrimary, fontSize: 14, padding: "10px 16px" }}>
                      Add date of birth to profile
                    </button>
                  </div>
                </div>
              )}
              {profile.eligibility?.age != null && profile.eligibility.age < 60 && !profile.member && (
                <div style={{ ...noticeCard, marginTop: 16, background: "#fff4df", color: COLORS.warning }}>
                  <PensionIcon kind="calendar" />
                  <p style={{ margin: 0 }}>You are not yet eligible. You can apply when you are 60 years old.</p>
                </div>
              )}
              {profile.member && (
                <div style={{ ...noticeCard, marginTop: 16, background: profile.member.membership_status === "SUSPENDED" ? "#fdecea" : COLORS.successLight }}>
                  <PensionIcon kind={profile.member.membership_status === "SUSPENDED" ? "alert" : "check"} />
                  <p style={{ margin: 0 }}>
                    {profile.member.membership_status === "SUSPENDED"
                      ? "Your pension is suspended while your record is reviewed."
                      : "You already have one pension application (" + profile.member.membership_status.replace(/_/g, " ").toLowerCase() + "). A person can receive only one pension."}
                  </p>
                </div>
              )}
            </section>

            {(profile.eligibility?.eligible || profile.member) && !profile.eligibility?.death_certificate_request && (
              <section style={{ ...section.wrapper, ...eligibilityCard }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={iconTile}><PensionIcon kind="wallet" /></div>
                  <div>
                    <h2 style={{ ...section.title, fontSize: 21 }}>{profile.member ? "Payment number" : "Where should we send your pension?"}</h2>
                    <p style={{ ...section.subtitle, margin: 0, fontSize: 14 }}>Enter a cellphone or bank account number. Use your profile phone or another number.</p>
                  </div>
                </div>
                {profile.identity?.payment_phone && (
                  <button type="button" onClick={() => setPaymentDestination(profile.identity.payment_phone)} style={{ ...btnOutline, margin: "8px 0 14px", fontSize: 15 }}>
                    Use phone on my profile ({profile.identity.phone})
                  </button>
                )}
                <form onSubmit={profile.member ? savePaymentDestination : submitRegistration} style={{ maxWidth: 560 }}>
                  <label htmlFor="pension-payment-destination" style={{ ...labelStyle, fontSize: 15 }}>Payment phone or account number</label>
                  <input id="pension-payment-destination" type="tel" inputMode="numeric" autoComplete="tel"
                    value={paymentDestination}
                    onChange={e => setPaymentDestination(e.target.value.replace(/[^0-9]/g, "").slice(0, 32))}
                    placeholder="Digits only, include country code" pattern="[0-9]{6,32}" maxLength={32} required
                    style={{ ...inputStyle, fontSize: 18, padding: "14px 16px", margin: "4px 0 8px", minHeight: 52 }} />
                  <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 18px" }}>Check the number carefully. This is where pension payments will be sent.</p>
                  {regMsg && <p role="status" style={{ color: /could not|error|valid|already|missing|must be|found/i.test(regMsg) ? COLORS.error : COLORS.success, fontSize: 14 }}>{regMsg}</p>}
                  <button type="submit" disabled={savingPaymentDestination} style={{ ...btnPrimary, fontSize: 16, minHeight: 50, padding: "12px 24px" }}>
                    {profile.member ? (savingPaymentDestination ? "Saving..." : "Save payment number") : "Apply for pension"}
                  </button>
                </form>
              </section>
            )}

            <section style={{ ...section.wrapper, marginTop: 24 }}>
              <h2 style={section.title}>Recent applications</h2>
              <p style={section.subtitle}>Your latest pension applications.</p>
              {applications.length === 0 ? (
                <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No applications yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {applications.filter(app => matchesDashboardSearch(app, searchQuery)).slice(0, 5).map(app => (
                    <article key={app.application_id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: 12, flexWrap: "wrap", background: "#fff",
                      border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14
                    }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{app.reference_number}</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                          {app.application_type.replace(/_/g, " ")} · {app.programme_name} · Submitted {new Date(app.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StatusBadge status={app.status} />
                        <button onClick={() => openDetail(app.application_id)} style={btnOutline}>
                          View details
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
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
              {applications.filter(a => matchesDashboardSearch(a, searchQuery)).map(a => {
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
            {contributions.filter(c => matchesDashboardSearch(c, searchQuery)).map(c => (
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
            {payments.filter(p => matchesDashboardSearch(p, searchQuery)).map(p => (
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
            {enquiries.filter(e => matchesDashboardSearch(e, searchQuery)).map(e => (
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
              {notifications.filter(n => matchesDashboardSearch(n, searchQuery)).map(n => (
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
                    <span>{d.original_filename}</span>{" "}
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
function InfoCard({ label, value }) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 10,
      border: "1px solid " + COLORS.borderLight,
      background: "#f8faff",
      minHeight: 66
    }}>
      <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <strong style={{ color: COLORS.textDark, fontSize: 16, lineHeight: 1.35, overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}

function PensionIcon({ kind }) {
  const iconPath = {
    identity: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.5 1.6-2 3-2s2.4.5 3 2M14 10h4M14 14h4" /></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2" /></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 9h18M16 14h2M6 6V4h12v2" /></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>
  }[kind];
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto" }}>
      {iconPath}
    </svg>
  );
}

// ============================================================
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
    <span className="dashboard-status-badge" style={{
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
      position: "fixed", inset: 0, zIndex: 1300,
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

const eligibilityCard = {
  background: "#fff",
  border: "1px solid " + COLORS.borderLight,
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 3px 12px rgba(0,32,159,0.04)"
};
const iconTile = {
  width: 48,
  height: 48,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: COLORS.blue,
  background: COLORS.blueLight,
  flex: "0 0 auto"
};
const stepChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 0",
  color: COLORS.textMid,
  fontSize: 13,
  fontWeight: 600
};
const noticeCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: 14,
  borderRadius: 10,
  background: COLORS.infoLight,
  color: COLORS.textDark,
  fontSize: 14,
  lineHeight: 1.5
};
const alertCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 20,
  padding: 16,
  border: "1px solid #f3b5b0",
  borderRadius: 10,
  background: "#fdecea",
  color: COLORS.error,
  fontSize: 14,
  lineHeight: 1.5
};

export default PensionsDashboard;

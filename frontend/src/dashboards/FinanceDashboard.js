import React, { useEffect, useState, useCallback, useRef } from "react";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import Navbar from "../components/Navbar";
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

const REQUEST_TYPES = [
  { key: "PENSION_ELIGIBILITY", label: "Check if I am Eligible for pensions", serviceCode: "FINANCE-ENQUIRY" }
];

const FIELD_GROUPS = {
  PENSION_ELIGIBILITY: [
    {
      key: "benefit_type",
      label: "Pension benefit",
      type: "select",
      required: true,
      options: [
        { value: "OLD_AGE", label: "Old age pension" },
        { value: "RETIREMENT", label: "Retirement benefit" },
        { value: "DEATH_SURVIVOR", label: "Death / survivor benefit" },
        { value: "ORPHAN", label: "Orphan pension" }
      ]
    }
  ]
};

function FinanceDashboard({ onLogout }) {
  const [tab, setTab] = useState("new");
  const [me, setMe] = useState(null);
  const [services, setServices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [activeType, setActiveType] = useState(null);
  const [form, setForm] = useState({ description: "" });
  const [fields, setFields] = useState({});
  const [docs, setDocs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState(null);

  const [ticketForm, setTicketForm] = useState({
    category: "SERVICE_ENQUIRY",
    subject: "",
    message: ""
  });
  const [ticketMsg, setTicketMsg] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [meRes, svcRes, reqRes, tktRes, nRes, payRes, supRes] = await Promise.all([
        api("/me"),
        api("/finance/services"),
        api("/finance/requests/my"),
        api("/finance/tickets/my"),
        api("/finance/notifications"),
        api("/finance/payments/my"),
        api("/finance/suppliers/my")
      ]);
      setMe(meRes.user);
      setServices(svcRes.services || []);
      setRequests(reqRes.requests || []);
      setTickets(tktRes.tickets || []);
      setNotifications(nRes.notifications || []);
      setPayments(payRes.payments || []);
      setSuppliers(supRes.suppliers || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openType(t) {
    setActiveType(t);
    setForm({ description: "" });
    setFields({});
    setDocs([]);
    setSubmitError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function closeType() {
    setActiveType(null);
    setFields({});
    setDocs([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    if (!activeType) return;

    const benefitType = fields.benefit_type;
    const benefit = FIELD_GROUPS.PENSION_ELIGIBILITY[0].options.find(option => option.value === benefitType);
    const needsAge = ["OLD_AGE", "RETIREMENT"].includes(benefitType);
    const needsCertificate = ["DEATH_SURVIVOR", "ORPHAN"].includes(benefitType);
    if (!benefitType) {
      setSubmitError("Select a pension benefit.");
      return;
    }
    if (needsAge && (!fields.age || Number(fields.age) < 0 || Number(fields.age) > 120)) {
      setSubmitError("Enter an age between 0 and 120.");
      return;
    }
    if (needsCertificate && (!docs[0] || !docs[0].type.startsWith("image/"))) {
      setSubmitError("Upload a photo of the required certificate.");
      return;
    }

    setSubmitting(true);
    try {
      const service = services.find(s => s.service_code === activeType.serviceCode);
      if (!service) throw new Error("Service not found");

      const fd = new FormData();
      fd.append("serviceId", service.service_id);
      fd.append("requestType", activeType.key);
      fd.append("subject", `Pension eligibility: ${benefit.label}`);
      fd.append("description", form.description || `Eligibility check for ${benefit.label}.`);
      fd.append("fields", JSON.stringify(fields));
      for (const f of docs) {
        if (f instanceof File) fd.append("documents", f, f.name);
      }

      const res = await api("/finance/requests", { method: "POST", body: fd });
      closeType();
      await load();
      alert(`Submitted. Reference: ${res.referenceNumber}`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(id) {
    try {
      const data = await api(`/finance/requests/${id}`);
      setSelected(data.request);
      setDetail(data);
    } catch (err) { alert(err.message); }
  }

  async function deleteRequest(r) {
    if (!window.confirm(`Delete request ${r.reference_no}? This cannot be undone.`)) return;
    setDeletingId(r.request_id);
    try {
      await api(`/finance/requests/${r.request_id}`, { method: "DELETE" });
      if (selected?.request_id === r.request_id) {
        setSelected(null); setDetail(null);
      }
      await load();
    } catch (err) {
      alert("Could not delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function markRead(id) {
    try {
      await api(`/finance/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev =>
        prev.map(n => n.notification_id === id
          ? { ...n, read_at: new Date().toISOString() }
          : n)
      );
    } catch (err) { console.error(err); }
  }

  async function submitTicket(e) {
    e.preventDefault();
    setTicketMsg("");
    try {
      await api("/finance/tickets", {
        method: "POST",
        body: JSON.stringify(ticketForm)
      });
      setTicketMsg("Your enquiry has been submitted.");
      setTicketForm({ category: "SERVICE_ENQUIRY", subject: "", message: "" });
      const tk = await api("/finance/tickets/my");
      setTickets(tk.tickets || []);
    } catch (err) {
      setTicketMsg("Error: " + err.message);
    }
  }

  const unread = notifications.filter(n => !n.read_at).length;
  const deletableStatuses = ["DRAFT", "SUBMITTED", "ACTION_REQUIRED"];
  const benefitType = fields.benefit_type;
  const needsAge = ["OLD_AGE", "RETIREMENT"].includes(benefitType);
  const certificateLabel = benefitType === "DEATH_SURVIVOR"
    ? "Photo of death certificate"
    : benefitType === "ORPHAN" ? "Photo of birth certificate" : "";

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
              <p style={header.eyebrow}>Ministry of Finance</p>
              <h1 style={header.title}>Finance Services</h1>
            </div>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        <Navbar
          items={[["new", "Submit request"]]}
          activeTab={tab}
          onTabChange={setTab}
          onLogout={onLogout}
          user={me}
        />

        {tab === "new" && (
          <section>
            <h2 style={section.title}>Submit request</h2>
            <p style={section.subtitle}>Check which pension benefit may apply to you.</p>
            <article style={{
              maxWidth: 620, background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 12
            }}>
              <h3 style={{ margin: 0, fontSize: 16, color: COLORS.blue }}>
                Check if I am Eligible for pensions
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMid, lineHeight: 1.55 }}>
                Choose old age pension, retirement benefit, death / survivor benefit, or orphan pension.
              </p>
              <button type="button" onClick={() => openType(REQUEST_TYPES[0])} style={{
                alignSelf: "flex-start", marginTop: 4, padding: "9px 14px",
                border: 0, background: COLORS.blue, color: "#fff", borderRadius: 6,
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit"
              }}>
                Start eligibility check
              </button>
            </article>
          </section>
        )}

        {tab === "mine" && (
          <section>
            <h2 style={section.title}>My requests</h2>
            <p style={section.subtitle}>Track every Finance request you've submitted.</p>
            <div style={{ display: "grid", gap: 14 }}>
              {requests.length === 0 && (
                <div style={{
                  padding: 40, textAlign: "center", background: "#fff",
                  border: `1px solid ${COLORS.border}`, borderRadius: 12,
                  color: COLORS.textMuted, fontSize: 13
                }}>You haven't submitted any Finance requests yet.</div>
              )}
              {requests.map(r => {
                const canDelete = deletableStatuses.includes(r.status);
                const isDel = deletingId === r.request_id;
                return (
                  <article key={r.request_id} style={{
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
                      }}>{r.reference_no}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{r.subject}</h3>
                    <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                      {r.service_name} · {r.request_type.replace(/_/g, " ")}
                      {r.amount != null ? ` · M ${Number(r.amount).toFixed(2)}` : ""}
                      {" · Submitted "}{new Date(r.submitted_at).toLocaleDateString()}
                    </p>
                    {r.admin_notes && (
                      <p style={{
                        margin: "0 0 12px", padding: 10, background: COLORS.blueLight,
                        borderRadius: 6, fontSize: 12, color: COLORS.textMid
                      }}><strong>Officer note:</strong> {r.admin_notes}</p>
                    )}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button onClick={() => openDetail(r.request_id)} style={btnOutline}>
                        View details
                      </button>
                      <button
                        onClick={() => deleteRequest(r)}
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

        {tab === "suppliers" && (
          <section>
            <h2 style={section.title}>My suppliers</h2>
            <p style={section.subtitle}>Business registrations associated with your account.</p>
            {suppliers.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                No supplier registrations yet. Use "Submit request → Supplier registration".
              </p>
            )}
            {suppliers.map(s => (
              <article key={s.supplier_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{s.legal_business_name}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Reg: {s.company_registration_no || "—"} · TIN: {s.tax_identification_no || "—"}
                    </p>
                  </div>
                  <StatusBadge status={s.registration_status} />
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "payments" && (
          <section>
            <h2 style={section.title}>My payments</h2>
            <p style={section.subtitle}>
              Every government payment or refund paid to you is listed here.
            </p>
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
                      M {Number(p.amount).toFixed(2)} · {p.payment_purpose.replace(/_/g, " ")}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Trx: {p.transaction_reference}
                      {p.receipt_number ? ` · Receipt ${p.receipt_number}` : ""}
                      {p.paid_at ? ` · ${new Date(p.paid_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "tickets" && (
          <section>
            <h2 style={section.title}>Enquiries & complaints</h2>
            <p style={section.subtitle}>
              Report delayed payments, refunds, incorrect charges, failed transactions or general issues.
            </p>

            <div style={{
              background: "#fff", border: `1px solid ${COLORS.border}`,
              borderRadius: 12, padding: 24, marginBottom: 20
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue }}>
                Submit a new enquiry
              </h3>
              <form onSubmit={submitTicket}>
                <label style={labelStyle}>Category</label>
                <select value={ticketForm.category}
                  onChange={e => setTicketForm(p => ({ ...p, category: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="DELAYED_PAYMENT">Delayed payment</option>
                  <option value="TAX_REFUND">Tax refund</option>
                  <option value="INCORRECT_CHARGE">Incorrect charge</option>
                  <option value="FAILED_TRANSACTION">Failed transaction</option>
                  <option value="SERVICE_ENQUIRY">Service enquiry</option>
                  <option value="OTHER">Other</option>
                </select>

                <label style={labelStyle}>Subject</label>
                <input required value={ticketForm.subject}
                  onChange={e => setTicketForm(p => ({ ...p, subject: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                <label style={labelStyle}>Message</label>
                <textarea required rows={4} value={ticketForm.message}
                  onChange={e => setTicketForm(p => ({ ...p, message: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />

                {ticketMsg && (
                  <p style={{
                    color: ticketMsg.startsWith("Error") ? COLORS.error : COLORS.green,
                    fontSize: 13, marginBottom: 12
                  }}>{ticketMsg}</p>
                )}
                <button type="submit" style={btnPrimary}>Submit</button>
              </form>
            </div>

            <h3 style={{ fontSize: 14, color: COLORS.blue, marginBottom: 12 }}>
              My previous enquiries
            </h3>
            {tickets.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No enquiries yet.</p>
            )}
            {tickets.map(t => (
              <article key={t.ticket_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{t.subject}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                      {t.ticket_reference} · {t.category.replace(/_/g, " ")} · {new Date(t.opened_at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textMid }}>{t.message}</p>
                {t.response_text && (
                  <div style={{
                    margin: "10px 0 0", padding: 10,
                    background: COLORS.blueLight, borderRadius: 6,
                    fontSize: 12, color: COLORS.textMid
                  }}>
                    <strong>Response:</strong> {t.response_text}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === "notifications" && (
          <section>
            <h2 style={section.title}>Notifications</h2>
            <p style={section.subtitle}>Updates on your Finance submissions.</p>
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
      </div>

      {activeType && (
        <Overlay onClose={closeType}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>{activeType.label}</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.textMuted }}>
            Fill in the details. Fields marked * are required.
          </p>
          <form onSubmit={submit}>
            {(FIELD_GROUPS[activeType.key] || []).map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label} *</label>
                <select required value={fields[f.key] || ""}
                  onChange={e => {
                    setFields({ [f.key]: e.target.value });
                    setDocs([]);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  style={inputStyle}>
                  <option value="">Select...</option>
                  {(f.options || []).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            ))}

            {needsAge && (
              <>
                <label style={labelStyle}>Your age *</label>
                <input type="number" min="0" max="120" required value={fields.age || ""}
                  onChange={e => setFields(p => ({ ...p, age: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />
              </>
            )}

            {certificateLabel && (
              <>
                <label style={labelStyle}>{certificateLabel} *</label>
                <input type="file" accept="image/*" required ref={fileRef}
                  onChange={e => setDocs(Array.from(e.target.files || []))}
                  style={{ marginBottom: 14 }} />
              </>
            )}

            <label style={labelStyle}>Additional details (optional)</label>
            <textarea rows={4} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />
            {docs.length > 0 && (
              <ul style={{ marginTop: 0, paddingLeft: 18, fontSize: 12, color: COLORS.textMid }}>
                {docs.map((f, i) => <li key={i}>{f.name} · {Math.round(f.size / 1024)} KB</li>)}
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

      {selected && detail && (
        <Overlay onClose={() => { setSelected(null); setDetail(null); }}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {selected.reference_no}
          </h2>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.textMuted }}>
            {selected.subject} · {selected.service_name}
          </p>

          <Row label="Status" value={selected.status.replace(/_/g, " ")} />
          <Row label="Type" value={selected.request_type.replace(/_/g, " ")} />
          {selected.amount != null && (
            <Row label="Amount" value={`M ${Number(selected.amount).toFixed(2)}`} />
          )}
          <Row label="Submitted" value={new Date(selected.submitted_at).toLocaleString()} />
          {selected.admin_notes && <Row label="Officer note" value={selected.admin_notes} />}
          {selected.decision_notes && <Row label="Decision" value={selected.decision_notes} />}

          <h3 style={subHeading}>Details</h3>
          {detail.values?.map((v, i) => (
            <Row key={i} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
          ))}

          {detail.documents?.length > 0 && (
            <>
              <h3 style={subHeading}>Documents</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                {detail.documents.map(d => (
                  <li key={d.document_id}>
                    <span>{d.original_filename}</span>{" "}
                    <small style={{ color: COLORS.textMuted }}>({d.validation_status})</small>
                  </li>
                ))}
              </ul>
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
                  {h.note && <div style={{ color: COLORS.textMid }}>{h.note}</div>}
                </div>
              ))}
            </>
          )}

          {detail.payments?.length > 0 && (
            <>
              <h3 style={subHeading}>Payments</h3>
              {detail.payments.map(p => (
                <Row key={p.payment_id}
                  label={`${p.payment_purpose.replace(/_/g, " ")} · M ${Number(p.amount).toFixed(2)}`}
                  value={p.status} />
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
    DRAFT:           { bg: "#f1f5f9", fg: "#475569" },
    SUBMITTED:       { bg: "#eff8ff", fg: "#175cd3" },
    VALIDATING:      { bg: "#eff8ff", fg: "#175cd3" },
    UNDER_REVIEW:    { bg: "#fff4df", fg: "#b45309" },
    ACTION_REQUIRED: { bg: "#fff4df", fg: "#b45309" },
    APPROVED:        { bg: "#ecfdf3", fg: "#067647" },
    REJECTED:        { bg: "#fdecea", fg: "#b3261e" },
    PROCESSING:      { bg: "#e6f4f1", fg: "#0f766e" },
    COMPLETED:       { bg: "#f0edfc", fg: "#6651aa" },
    CANCELLED:       { bg: "#f1f5f9", fg: "#475569" },

    OPEN:            { bg: "#eff8ff", fg: "#175cd3" },
    WAITING_FOR_USER:{ bg: "#fff4df", fg: "#b45309" },
    RESOLVED:        { bg: "#ecfdf3", fg: "#067647" },
    CLOSED:          { bg: "#f1f5f9", fg: "#475569" },

    SUCCESS:         { bg: "#ecfdf3", fg: "#067647" },
    PENDING:         { bg: "#fff4df", fg: "#b45309" },
    FAILED:          { bg: "#fdecea", fg: "#b3261e" },
    INITIATED:       { bg: "#eff8ff", fg: "#175cd3" },

    VERIFIED:        { bg: "#ecfdf3", fg: "#067647" },
    ACCEPTED:        { bg: "#ecfdf3", fg: "#067647" }
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

export default FinanceDashboard;
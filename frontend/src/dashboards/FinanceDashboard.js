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

const REQUEST_ICONS = {
  TAX_REQUEST: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  ),
  TAX_CLEARANCE: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 9 16l10-10" />
      <path d="M20 6.5V4h-2.5" />
      <path d="M3 19.5h18" />
    </svg>
  ),
  TAX_DECLARATION: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M8 12h8M8 16h8" />
    </svg>
  ),
  SUPPLIER_REGISTRATION: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21V7l9-4 9 4v14" />
      <path d="M8 10h8M8 14h8M8 18h8" />
    </svg>
  ),
  INVOICE_CLAIM: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M8 12h8M8 16h6" />
      <path d="M8 8h3" />
    </svg>
  ),
  TAX_REFUND: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M17 7.5A3.5 3.5 0 0 0 12 5h-1a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-1a3.5 3.5 0 0 1-5-2.5" />
    </svg>
  ),
  GENERAL_ENQUIRY: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-5 4v-4.5A2.5 2.5 0 0 1 5 13.5v-7z" />
      <path d="M8 9h8M8 12h6" />
    </svg>
  )
};

const REQUEST_TYPES = [
  { key: "TAX_REQUEST",           label: "Tax-related request",       icon: REQUEST_ICONS.TAX_REQUEST, serviceCode: "TAX-REQUEST" },
  { key: "TAX_CLEARANCE",         label: "Tax clearance request",     icon: REQUEST_ICONS.TAX_CLEARANCE, serviceCode: "TAX-CLEARANCE" },
  { key: "TAX_DECLARATION",       label: "Tax declaration",           icon: REQUEST_ICONS.TAX_DECLARATION, serviceCode: "TAX-DECLARATION" },
  { key: "SUPPLIER_REGISTRATION", label: "Supplier registration",     icon: REQUEST_ICONS.SUPPLIER_REGISTRATION, serviceCode: "SUPPLIER-REG" },
  { key: "INVOICE_CLAIM",         label: "Invoice / payment claim",   icon: REQUEST_ICONS.INVOICE_CLAIM, serviceCode: "INVOICE-CLAIM" },
  { key: "TAX_REFUND",            label: "Tax refund request",        icon: REQUEST_ICONS.TAX_REFUND, serviceCode: "TAX-REFUND" },
  { key: "GENERAL_ENQUIRY",       label: "Finance enquiry",           icon: REQUEST_ICONS.GENERAL_ENQUIRY, serviceCode: "FINANCE-ENQUIRY" }
];

const FIELD_GROUPS = {
  TAX_REQUEST: [
    { key: "taxpayer_type", label: "Taxpayer type", type: "select", options: ["INDIVIDUAL","BUSINESS","OTHER"] },
    { key: "tax_id", label: "Tax ID / TIN", type: "text" },
    { key: "tax_period", label: "Tax period", type: "text" }
  ],
  TAX_CLEARANCE: [
    { key: "taxpayer_type", label: "Taxpayer type", type: "select", options: ["INDIVIDUAL","BUSINESS","OTHER"] },
    { key: "tax_id", label: "Tax ID / TIN", type: "text" },
    { key: "tax_period", label: "Period covered", type: "text" }
  ],
  TAX_DECLARATION: [
    { key: "taxpayer_type", label: "Taxpayer type", type: "select", options: ["INDIVIDUAL","BUSINESS","OTHER"] },
    { key: "tax_id", label: "Tax ID / TIN", type: "text" },
    { key: "tax_period", label: "Tax period", type: "text" }
  ],
  SUPPLIER_REGISTRATION: [
    { key: "legal_business_name", label: "Legal business name", type: "text" },
    { key: "trading_name", label: "Trading name", type: "text" },
    { key: "company_registration_no", label: "Company registration no.", type: "text" },
    { key: "tax_identification_no", label: "Tax ID / TIN", type: "text" },
    { key: "contact_person", label: "Contact person", type: "text" },
    { key: "business_email", label: "Business email", type: "email" },
    { key: "business_phone", label: "Business phone", type: "tel" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "bank_name", label: "Bank name", type: "text" },
    { key: "bank_account_name", label: "Account holder name", type: "text" },
    { key: "bank_account_number", label: "Account number", type: "text" }
  ],
  INVOICE_CLAIM: [
    { key: "invoice_number", label: "Invoice number", type: "text" },
    { key: "purchase_order_no", label: "Purchase order no.", type: "text" },
    { key: "contract_reference", label: "Contract reference", type: "text" },
    { key: "delivery_note_reference", label: "Delivery note reference", type: "text" },
    { key: "issuing_ministry", label: "Issuing ministry", type: "text" },
    { key: "invoice_date", label: "Invoice date", type: "date" },
    { key: "due_date", label: "Due date", type: "date" }
  ],
  TAX_REFUND: [
    { key: "tax_id", label: "Tax ID / TIN", type: "text" },
    { key: "tax_period", label: "Tax period", type: "text" },
    { key: "amount_claimed", label: "Amount claimed (LSL)", type: "number" }
  ],
  GENERAL_ENQUIRY: [
    { key: "related_reference", label: "Related reference (optional)", type: "text" }
  ]
};

function FinanceDashboard() {
  const [tab, setTab] = useState("services");
  const [me, setMe] = useState(null);
  const [services, setServices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [activeType, setActiveType] = useState(null);
  const [form, setForm] = useState({ subject: "", description: "", amount: "" });
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
    setForm({ subject: "", description: "", amount: "" });
    setFields({});
    setDocs([]);
    setSubmitError("");
  }

  function closeType() {
    setActiveType(null);
    setFields({});
    setDocs([]);
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    if (!activeType) return;
    setSubmitting(true);
    try {
      const service = services.find(s => s.service_code === activeType.serviceCode);
      if (!service) throw new Error("Service not found");

      const fd = new FormData();
      fd.append("serviceId", service.service_id);
      fd.append("requestType", activeType.key);
      fd.append("subject", form.subject);
      fd.append("description", form.description);
      if (form.amount) fd.append("amount", form.amount);
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

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={header.content}>
            <p style={header.eyebrow}>Ministry of Finance</p>
            <h1 style={header.title}>Finance Services</h1>
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
          <StatCard label="My requests" value={requests.length} accent={COLORS.blue} />
          <StatCard label="My payments" value={payments.length} accent={COLORS.green} />
          <StatCard label="Open enquiries" value={
            tickets.filter(t => ["OPEN","UNDER_REVIEW","WAITING_FOR_USER"].includes(t.status)).length
          } accent={COLORS.blue} />
          <StatCard label="Notifications" value={unread} accent={COLORS.blue} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["services", "Browse services"],
            ["new", "Submit request"],
            ["mine", `My requests (${requests.length})`],
            ["suppliers", `My suppliers (${suppliers.length})`],
            ["payments", `Payments (${payments.length})`],
            ["tickets", `Enquiries (${tickets.length})`],
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

        {tab === "services" && (
          <section>
            <h2 style={section.title}>Finance services</h2>
            <p style={section.subtitle}>
              Browse services, eligibility rules, required documents and fees.
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16
            }}>
              {services.map(s => (
                <article key={s.service_id} style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 20,
                  display: "flex", flexDirection: "column", gap: 10
                }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: COLORS.blue }}>{s.service_name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: COLORS.textMid, lineHeight: 1.55 }}>
                    {s.description}
                  </p>
                  {s.eligibility_rules && (
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>
                      <strong>Eligibility:</strong> {s.eligibility_rules}
                    </p>
                  )}
                  {s.required_documents && (
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>
                      <strong>Documents:</strong> {s.required_documents}
                    </p>
                  )}
                  {s.fee_amount != null && (
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>
                      <strong>Fee:</strong> M {Number(s.fee_amount).toFixed(2)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "new" && (
          <section>
            <h2 style={section.title}>What would you like to submit?</h2>
            <p style={section.subtitle}>Choose a service to start a Finance request.</p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16
            }}>
              {REQUEST_TYPES.map(t => {
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
                    <button onClick={() => { setTab("new"); openType(t); }} style={{
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
            <label style={labelStyle}>Subject *</label>
            <input required value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Description *</label>
            <textarea required rows={4} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 14 }} />

            {["INVOICE_CLAIM","TAX_REFUND"].includes(activeType.key) && (
              <>
                <label style={labelStyle}>Amount (LSL)</label>
                <input type="number" step="0.01" value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 14 }} />
              </>
            )}

            {(FIELD_GROUPS[activeType.key] || []).map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea rows={3} value={fields[f.key] || ""}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle} />
                ) : f.type === "select" ? (
                  <select value={fields[f.key] || ""}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle}>
                    <option value="">Select…</option>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={fields[f.key] || ""}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle} />
                )}
              </div>
            ))}

            <label style={labelStyle}>Supporting documents (up to 10)</label>
            <input type="file" multiple ref={fileRef}
              onChange={e => setDocs(Array.from(e.target.files || []))} />
            {docs.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12, color: COLORS.textMid }}>
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
                    <a href={`${API_BASE.replace("/api", "")}${d.storage_path}`}
                       target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
                      {d.original_filename}
                    </a>{" "}
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

export default FinanceDashboard;
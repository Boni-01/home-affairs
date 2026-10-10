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
  { key: "VALIDATING", label: "Validating" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "ACTION_REQUIRED", label: "Action required" },
  { key: "APPROVED", label: "Approved" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CANCELLED", label: "Cancelled" }
];

const REQUEST_TYPE_FILTERS = [
  { key: "", label: "All types" },
  { key: "TAX_REQUEST", label: "Tax request" },
  { key: "TAX_CLEARANCE", label: "Tax clearance" },
  { key: "TAX_DECLARATION", label: "Tax declaration" },
  { key: "SUPPLIER_REGISTRATION", label: "Supplier registration" },
  { key: "INVOICE_CLAIM", label: "Invoice claim" },
  { key: "TAX_REFUND", label: "Tax refund" },
  { key: "GENERAL_ENQUIRY", label: "Finance enquiry" }
];

export default function FinanceDashboardAdmin() {
  const [tab, setTab] = useState("requests");

  const [stats, setStats] = useState({});
  const [requests, setRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [audit, setAudit] = useState([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Ticket response state
  const [ticketResponses, setTicketResponses] = useState({});
  const [ticketMsg, setTicketMsg] = useState({});

  const loadStats = useCallback(async () => {
    try {
      const data = await api("/finance/admin/stats");
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (typeFilter) qs.set("request_type", typeFilter);
      const data = await api(`/finance/admin/requests?${qs}`);
      setRequests(data.requests || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await api("/finance/admin/suppliers");
      setSuppliers(data.suppliers || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await api("/finance/admin/invoices");
      setInvoices(data.invoices || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadRefunds = useCallback(async () => {
    try {
      const data = await api("/finance/admin/refunds");
      setRefunds(data.refunds || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const data = await api("/finance/admin/payments");
      setPayments(data.payments || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const data = await api("/finance/admin/tickets");
      setTickets(data.tickets || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const data = await api("/finance/admin/audit");
      setAudit(data.logs || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => {
    if (tab === "suppliers") loadSuppliers();
    if (tab === "invoices") loadInvoices();
    if (tab === "refunds") loadRefunds();
    if (tab === "payments") loadPayments();
    if (tab === "tickets") loadTickets();
    if (tab === "audit") loadAudit();
  }, [tab, loadSuppliers, loadInvoices, loadRefunds, loadPayments, loadTickets, loadAudit]);

  async function openRequest(id) {
    try {
      const data = await api(`/finance/requests/${id}`);
      setSelected(data.request);
      setDetail(data);
      setNote("");
    } catch (err) { alert(err.message); }
  }

  async function setStatus(newStatus) {
    if (!selected) return;
    setUpdating(true);
    try {
      await api(`/finance/admin/requests/${selected.request_id}/status`, {
        method: "POST",
        body: JSON.stringify({ newStatus, note })
      });
      await openRequest(selected.request_id);
      await loadRequests();
      await loadStats();
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  }

  async function setSupplierStatus(supplierId, registration_status, validation_status) {
    try {
      await api(`/finance/admin/suppliers/${supplierId}/status`, {
        method: "POST",
        body: JSON.stringify({ registration_status, validation_status })
      });
      await loadSuppliers();
      await loadStats();
    } catch (err) { alert(err.message); }
  }

  async function setInvoiceStatus(claimId, workflow_status, validation_status, notes) {
    try {
      await api(`/finance/admin/invoices/${claimId}/status`, {
        method: "POST",
        body: JSON.stringify({
          workflow_status,
          validation_status,
          validation_notes: notes
        })
      });
      await loadInvoices();
      await loadStats();
    } catch (err) { alert(err.message); }
  }

  async function setRefundStatus(refundId, workflow_status, validation_status, amount_approved) {
    try {
      await api(`/finance/admin/refunds/${refundId}/status`, {
        method: "POST",
        body: JSON.stringify({
          workflow_status,
          validation_status,
          amount_approved: amount_approved || undefined
        })
      });
      await loadRefunds();
      await loadStats();
    } catch (err) { alert(err.message); }
  }

  async function respondToTicket(ticketId) {
    const text = ticketResponses[ticketId];
    if (!text) return;
    try {
      await api(`/finance/admin/tickets/${ticketId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response_text: text, status: "RESOLVED" })
      });
      setTicketMsg(prev => ({ ...prev, [ticketId]: "Response sent." }));
      await loadTickets();
    } catch (err) {
      setTicketMsg(prev => ({ ...prev, [ticketId]: "Error: " + err.message }));
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
              <p style={header.eyebrow}>Ministry of Finance</p>
              <h1 style={header.title}>Finance Admin Dashboard</h1>
              <p style={header.subtitle}>
                Review, validate and route Finance submissions.
              </p>
            </div>
            <span style={header.liveBadge}>
              <span style={header.liveDot} />
              {stats.pendingRequests || 0} pending
            </span>
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        <section style={grids.metrics}>
          <Metric label="Total requests" value={stats.totalRequests || 0} />
          <Metric label="Pending" value={stats.pendingRequests || 0} />
          <Metric label="Pending suppliers" value={stats.pendingSuppliers || 0} />
          <Metric label="Pending invoices" value={stats.pendingInvoices || 0} />
          <Metric label="Pending refunds" value={stats.pendingRefunds || 0} />
          <Metric label="Open enquiries" value={stats.openTickets || 0} />
        </section>

        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["requests", "Requests"],
            ["suppliers", `Suppliers (${suppliers.length})`],
            ["invoices", `Invoices (${invoices.length})`],
            ["refunds", `Refunds (${refunds.length})`],
            ["payments", `Payments (${payments.length})`],
            ["tickets", `Enquiries (${tickets.length})`],
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

        {/* ---------------- Requests tab ---------------- */}
        {tab === "requests" && (
          <section style={grids.twoCol}>
            <article style={cards.cardPadded}>
              <h2 style={section.title}>Requests queue</h2>
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
                      {["Ref","Applicant","Type","Status",""].map(h =>
                        <th key={h} style={thStyle}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 && !loading && (
                      <tr><td colSpan={5} style={{ padding: 16, color: COLORS.textMuted }}>
                        No requests in queue.
                      </td></tr>
                    )}
                    {requests.map(r => (
                      <tr key={r.request_id}>
                        <td style={{ ...tdStyle, width: 44 }}>
                          {r.photo_url ? (
                            <img src={r.photo_url} alt={r.full_name}
                              style={{ width: 34, height: 42, borderRadius: 4, objectFit: "cover" }} />
                          ) : (
                            <div style={{
                              width: 34, height: 42, borderRadius: 4,
                              background: COLORS.lightBg, border: `1px solid ${COLORS.borderLight}`
                            }} />
                          )}
                        </td>
                        <td style={tdStyle}><strong>{r.reference_no}</strong></td>
                        <td style={tdStyle}>{r.full_name}</td>
                        <td style={tdStyle}>{r.request_type.replace(/_/g, " ")}</td>
                        <td style={tdStyle}><StatusBadge status={r.status} /></td>
                        <td style={tdStyle}>
                          <button style={linkBtn} onClick={() => openRequest(r.request_id)}>Open</button>
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
                  <h2 style={section.title}>Request detail</h2>
                  <p style={section.subtitle}>Select a request to review.</p>
                </>
              )}

              {selected && (
                <>
                  <h2 style={{ margin: 0, color: COLORS.blue, fontSize: 16 }}>
                    {selected.reference_no}
                  </h2>
                  <p style={{ margin: "4px 0 14px", fontSize: 12, color: COLORS.textMuted }}>
                    {selected.subject} · {selected.service_name}
                  </p>

                  <Row label="Applicant" value={selected.full_name} />
                  <Row label="National ID" value={selected.national_id || "—"} />
                  <Row label="Email" value={selected.email || "—"} />
                  <Row label="Phone" value={selected.phone || "—"} />
                  <Row label="Type" value={selected.request_type.replace(/_/g, " ")} />
                  {selected.amount != null && (
                    <Row label="Amount" value={`M ${Number(selected.amount).toFixed(2)}`} />
                  )}
                  <Row label="Status" value={<StatusBadge status={selected.status} />} />

                  <h3 style={subHeading}>Submitted values</h3>
                  {detail?.values?.map((v, i) => (
                    <Row key={i} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
                  ))}

                  {detail?.documents?.length > 0 && (
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

                  <h3 style={subHeading}>Update status</h3>
                  <textarea
                    placeholder="Note for the applicant (optional)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      ["VALIDATING","Validating",COLORS.blue],
                      ["UNDER_REVIEW","Under review","#b45309"],
                      ["ACTION_REQUIRED","Request info","#b45309"],
                      ["APPROVED","Approve",COLORS.green],
                      ["PROCESSING","Processing","#0f766e"],
                      ["COMPLETED","Complete","#6651aa"],
                      ["REJECTED","Reject",COLORS.error],
                      ["CANCELLED","Cancel","#475569"]
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

                  <div style={{ textAlign: "right", marginTop: 16 }}>
                    <button onClick={() => { setSelected(null); setDetail(null); }} style={btnSmall}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </aside>
          </section>
        )}

        {/* ---------------- Suppliers tab ---------------- */}
        {tab === "suppliers" && (
          <section>
            <h2 style={section.title}>Supplier registrations</h2>
            {suppliers.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No suppliers yet.</p>
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
                      Applicant: {s.full_name} · {s.email}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Reg: {s.company_registration_no || "—"} · TIN: {s.tax_identification_no || "—"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <StatusBadge status={s.registration_status} />
                    <StatusBadge status={s.validation_status} />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setSupplierStatus(s.supplier_id, "UNDER_REVIEW", "PENDING")} style={miniBtn(COLORS.blue)}>Under review</button>
                  <button onClick={() => setSupplierStatus(s.supplier_id, "ACTION_REQUIRED", "ACTION_REQUIRED")} style={miniBtn("#b45309")}>Request info</button>
                  <button onClick={() => setSupplierStatus(s.supplier_id, "ACCEPTED", "VERIFIED")} style={miniBtn(COLORS.green)}>Accept</button>
                  <button onClick={() => setSupplierStatus(s.supplier_id, "REJECTED", "FAILED")} style={miniBtn(COLORS.error)}>Reject</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ---------------- Invoices tab ---------------- */}
        {tab === "invoices" && (
          <section>
            <h2 style={section.title}>Invoice / payment claims</h2>
            {invoices.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No invoices yet.</p>
            )}
            {invoices.map(c => (
              <article key={c.claim_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>
                      Invoice {c.invoice_number} · M {Number(c.amount).toFixed(2)}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Applicant: {c.full_name} · Ref: {c.reference_no}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      PO: {c.purchase_order_no || "—"} · Contract: {c.contract_reference || "—"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <StatusBadge status={c.workflow_status} />
                    <StatusBadge status={c.validation_status} />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setInvoiceStatus(c.claim_id, "UNDER_REVIEW", "PASSED", "Under review")} style={miniBtn(COLORS.blue)}>Under review</button>
                  <button onClick={() => setInvoiceStatus(c.claim_id, "ACTION_REQUIRED", "MISMATCH", "Request info")} style={miniBtn("#b45309")}>Request info</button>
                  <button onClick={() => setInvoiceStatus(c.claim_id, "FORWARDED_FOR_APPROVAL", "PASSED", "Forwarded")} style={miniBtn("#7a1fa2")}>Forward</button>
                  <button onClick={() => setInvoiceStatus(c.claim_id, "APPROVED_BY_AUTHORITY", "PASSED", "Approved")} style={miniBtn(COLORS.green)}>Approve</button>
                  <button onClick={() => setInvoiceStatus(c.claim_id, "REJECTED", "FAILED", "Rejected")} style={miniBtn(COLORS.error)}>Reject</button>
                  <button onClick={() => setInvoiceStatus(c.claim_id, "PAID", "PASSED", "Paid")} style={miniBtn("#6651aa")}>Mark paid</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ---------------- Refunds tab ---------------- */}
        {tab === "refunds" && (
          <section>
            <h2 style={section.title}>Tax refunds</h2>
            {refunds.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No refunds yet.</p>
            )}
            {refunds.map(f => (
              <article key={f.refund_id} style={{
                background: "#fff", border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: 16, marginBottom: 10
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>
                      Claimed: M {Number(f.amount_claimed).toFixed(2)}
                      {f.amount_approved ? ` · Approved: M ${Number(f.amount_approved).toFixed(2)}` : ""}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      Applicant: {f.full_name} · Ref: {f.reference_no}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      TIN: {f.tax_id} · Period: {f.tax_period}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <StatusBadge status={f.workflow_status} />
                    <StatusBadge status={f.validation_status} />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setRefundStatus(f.refund_id, "UNDER_REVIEW", "PASSED")} style={miniBtn(COLORS.blue)}>Under review</button>
                  <button onClick={() => setRefundStatus(f.refund_id, "ACTION_REQUIRED", "MANUAL_REVIEW")} style={miniBtn("#b45309")}>Request info</button>
                  <button onClick={() => setRefundStatus(f.refund_id, "FORWARDED_TO_RSL", "PASSED")} style={miniBtn("#7a1fa2")}>Forward to RSL</button>
                  <button onClick={() => setRefundStatus(f.refund_id, "APPROVED_BY_AUTHORITY", "PASSED")} style={miniBtn(COLORS.green)}>Approve</button>
                  <button onClick={() => setRefundStatus(f.refund_id, "REJECTED", "FAILED")} style={miniBtn(COLORS.error)}>Reject</button>
                  <button onClick={() => setRefundStatus(f.refund_id, "PAYMENT_PROCESSING", "PASSED")} style={miniBtn("#0f766e")}>Processing</button>
                  <button onClick={() => setRefundStatus(f.refund_id, "PAID", "PASSED")} style={miniBtn("#6651aa")}>Mark paid</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ---------------- Payments tab ---------------- */}
        {tab === "payments" && (
          <section>
            <h2 style={section.title}>Payments</h2>
            {payments.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No payments yet.</p>
            )}
            <div style={cards.cardPadded}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Timestamp","Payer","Purpose","Amount","Trx","Status"].map(h =>
                      <th key={h} style={thStyle}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.payment_id}>
                      <td style={tdStyle}>{new Date(p.created_at).toLocaleString()}</td>
                      <td style={tdStyle}>{p.full_name}</td>
                      <td style={tdStyle}>{p.payment_purpose.replace(/_/g, " ")}</td>
                      <td style={tdStyle}>M {Number(p.amount).toFixed(2)}</td>
                      <td style={tdStyle}>{p.transaction_reference}</td>
                      <td style={tdStyle}><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------------- Tickets tab ---------------- */}
        {tab === "tickets" && (
          <section>
            <h2 style={section.title}>Enquiries & complaints</h2>
            {tickets.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>No tickets yet.</p>
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
                      {t.ticket_reference} · {t.full_name} · {t.email}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textMid }}>
                  {t.message}
                </p>
                {t.response_text ? (
                  <div style={{
                    margin: "10px 0 0", padding: 10,
                    background: COLORS.blueLight, borderRadius: 6,
                    fontSize: 12, color: COLORS.textMid
                  }}>
                    <strong>Your response:</strong> {t.response_text}
                  </div>
                ) : (
                  <>
                    <textarea
                      placeholder="Your response"
                      value={ticketResponses[t.ticket_id] || ""}
                      onChange={e => setTicketResponses(p => ({ ...p, [t.ticket_id]: e.target.value }))}
                      rows={2}
                      style={{ ...inputStyle, marginTop: 10, marginBottom: 8 }}
                    />
                    <button onClick={() => respondToTicket(t.ticket_id)} style={btnSmall}>
                      Send response
                    </button>
                    {ticketMsg[t.ticket_id] && (
                      <p style={{
                        fontSize: 12, marginTop: 6,
                        color: ticketMsg[t.ticket_id].startsWith("Error") ? COLORS.error : COLORS.green
                      }}>{ticketMsg[t.ticket_id]}</p>
                    )}
                  </>
                )}
              </article>
            ))}
          </section>
        )}

        {/* ---------------- Audit tab ---------------- */}
        {tab === "audit" && (
          <section>
            <h2 style={section.title}>Audit log</h2>
            <div style={cards.cardPadded}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Timestamp","Actor","Action","Entity"].map(h =>
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
                      <td style={tdStyle}>{l.entity_type} #{l.entity_id || "—"}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={4} style={{
                      padding: 16, color: COLORS.textMuted, fontSize: 13
                    }}>No audit records.</td></tr>
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
      <span style={{ color: COLORS.textMuted, textTransform: "capitalize", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ color: COLORS.textDark, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
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
    APPROVED_BY_AUTHORITY: { bg: "#ecfdf3", fg: "#067647" },
    REJECTED:        { bg: "#fdecea", fg: "#b3261e" },
    PROCESSING:      { bg: "#e6f4f1", fg: "#0f766e" },
    PAYMENT_PROCESSING: { bg: "#e6f4f1", fg: "#0f766e" },
    FORWARDED_FOR_APPROVAL: { bg: "#f5e9fb", fg: "#7a1fa2" },
    FORWARDED_TO_RSL: { bg: "#f5e9fb", fg: "#7a1fa2" },
    COMPLETED:       { bg: "#f0edfc", fg: "#6651aa" },
    CANCELLED:       { bg: "#f1f5f9", fg: "#475569" },
    PAID:            { bg: "#ecfdf3", fg: "#067647" },
    PASSED:          { bg: "#ecfdf3", fg: "#067647" },
    PENDING:         { bg: "#fff4df", fg: "#b45309" },
    FAILED:          { bg: "#fdecea", fg: "#b3261e" },
    MISMATCH:        { bg: "#fdecea", fg: "#b3261e" },
    MANUAL_REVIEW:   { bg: "#fff4df", fg: "#b45309" },
    NOT_CHECKED:     { bg: "#f1f5f9", fg: "#475569" },
    VERIFIED:        { bg: "#ecfdf3", fg: "#067647" },
    ACCEPTED:        { bg: "#ecfdf3", fg: "#067647" },
    VALIDATION_FAILED: { bg: "#fdecea", fg: "#b3261e" },
    OPEN:            { bg: "#eff8ff", fg: "#175cd3" },
    WAITING_FOR_USER:{ bg: "#fff4df", fg: "#b45309" },
    RESOLVED:        { bg: "#ecfdf3", fg: "#067647" },
    CLOSED:          { bg: "#f1f5f9", fg: "#475569" }
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
  fontWeight: 700, borderBottom: `1px solid ${COLORS.borderLight}`, whiteSpace: "nowrap"
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
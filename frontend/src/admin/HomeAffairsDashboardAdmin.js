import React, { useEffect, useState, useCallback } from "react";
import { COLORS, layout, header, cards, grids, section } from "../styles/dashboardStyles";
import Navbar from "../components/Navbar";
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

                  <h3 style={subHeading}>Submitted fields</h3>
                  {detail?.values?.map(v => (
                    <Row key={v.field_key} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
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
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

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

const btnSmall = {
  padding: "8px 14px", border: 0, background: COLORS.blue,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
};

const checkboxLabel = {
  display: "block", fontSize: 13, color: COLORS.textMid, marginBottom: 4
};

export default HomeAffairsDashboardAdmin;

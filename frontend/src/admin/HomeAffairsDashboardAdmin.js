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

const STATUS_FILTERS = [
  { key: "", label: "All statuses" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under review" },
  { key: "more_information_required", label: "Info required" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "payment_verified", label: "Payment verified" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "ready_for_collection", label: "Ready" },
  { key: "completed", label: "Completed" }
];

const MODULE_FILTERS = [
  { key: "", label: "All modules" },
  { key: "NICR", label: "NICR" },
  { key: "IMMIGRATION", label: "Immigration" },
  { key: "LRMIS", label: "LRMIS" }
];

function HomeAffairsDashboardAdmin() {
  const [stats, setStats] = useState({
    byStatus: [], byModule: [], users: [],
    totalApplications: 0, totalUsers: 0
  });
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailValues, setDetailValues] = useState([]);
  const [detailDocs, setDetailDocs] = useState([]);
  const [detailHistory, setDetailHistory] = useState([]);
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await api("/admin/stats");
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (moduleFilter) qs.set("module", moduleFilter);
      const data = await api(`/admin/applications?${qs}`);
      setQueue(data.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, moduleFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function openApplication(id) {
    try {
      const data = await api(`/applications/${id}`);
      setSelected(data.application);
      setDetailValues(data.values || []);
      setDetailDocs(data.documents || []);
      setDetailHistory(data.history || []);
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
      setNote("");
    } catch (err) { alert(err.message); }
    finally { setUpdating(false); }
  }

  const countFor = (key) =>
    stats.byStatus.find(s => s.status === key)?.count || 0;

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        {/* ============================================================
            HEADER
            ============================================================ */}
        <header style={header.wrapper}>
          <div style={{
            ...header.content,
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 16, flexWrap: "wrap"
          }}>
            <div>
              <p style={header.eyebrow}>Home Affairs · Administrator</p>
              <h1 style={header.title}>Administrator Dashboard</h1>
              <p style={header.subtitle}>
                Review and process citizen applications
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

        {/* ============================================================
            METRICS
            ============================================================ */}
        <section style={grids.metrics}>
          <Metric label="Submitted" value={countFor("submitted")} />
          <Metric label="Under review" value={countFor("under_review")} />
          <Metric label="Info required" value={countFor("more_information_required")} />
          <Metric label="Approved" value={countFor("approved")} />
          <Metric label="Ready" value={countFor("ready_for_collection")} />
          <Metric label="Completed" value={countFor("completed")} />
          <Metric label="Total users" value={stats.totalUsers || 0} />
          <Metric label="Total applications" value={stats.totalApplications || 0} />
        </section>

        {/* ============================================================
            QUEUE + DETAIL
            ============================================================ */}
        <section style={grids.twoCol}>
          {/* QUEUE */}
          <article style={cards.cardPadded}>
            <h2 style={section.title}>Application queue</h2>
            <p style={section.subtitle}>Review incoming requests from citizens.</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <select
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}
                style={selectStyle}
              >
                {MODULE_FILTERS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={selectStyle}
              >
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
                    {["Ref", "Applicant", "Service", "Status", ""].map(h =>
                      <th key={h} style={thStyle}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} style={{
                        padding: 16, color: COLORS.textMuted, fontSize: 13
                      }}>
                        No applications in this view.
                      </td>
                    </tr>
                  )}
                  {queue.map(a => (
                    <tr key={a.application_id}>
                      <td style={{ ...tdStyle, width: 44 }}>
                        {a.photo_url ? (
                          <img
                            src={a.photo_url}
                            alt={a.full_name}
                            style={{
                              width: 34, height: 42,
                              borderRadius: 4,
                              objectFit: "cover",
                              border: `1px solid ${COLORS.borderLight}`,
                              display: "block"
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 34, height: 42, borderRadius: 4,
                            background: COLORS.lightBg,
                            border: `1px solid ${COLORS.borderLight}`,
                            display: "grid", placeItems: "center",
                            fontSize: 8, color: COLORS.textMuted
                          }}>
                            N/A
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <strong>{a.reference_number}</strong>
                        <div style={{
                          fontSize: 11, color: COLORS.textMuted, marginTop: 2
                        }}>
                          {a.module}
                        </div>
                      </td>
                      <td style={tdStyle}>{a.full_name || "—"}</td>
                      <td style={tdStyle}>{a.service_type}</td>
                      <td style={tdStyle}><StatusBadge status={a.status} /></td>
                      <td style={tdStyle}>
                        <button
                          style={linkBtn}
                          onClick={() => openApplication(a.application_id)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* DETAIL PANEL */}
          <aside style={cards.cardPadded}>
            {!selected && (
              <>
                <h2 style={section.title}>Application detail</h2>
                <p style={section.subtitle}>
                  Select an application from the queue to review it.
                </p>
              </>
            )}

            {selected && (
              <>
                {/* Header row */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: 16, gap: 12
                }}>
                  <div>
                    <h2 style={{ margin: 0, color: COLORS.blue, fontSize: 16 }}>
                      {selected.reference_number}
                    </h2>
                    <p style={{
                      margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted
                    }}>
                      {selected.service_type} · {selected.module}
                    </p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                {/* Applicant block with photo */}
                <div style={{
                  display: "flex", gap: 16,
                  padding: 14, marginBottom: 14,
                  background: COLORS.lightBg,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.borderLight}`
                }}>
                  <div style={{
                    width: 90, height: 116,
                    borderRadius: 6,
                    overflow: "hidden",
                    border: `1px solid ${COLORS.border}`,
                    background: "#fff",
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center"
                  }}>
                    {selected.photo_url ? (
                      <img
                        src={selected.photo_url}
                        alt={selected.full_name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    ) : (
                      <span style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        textAlign: "center",
                        padding: 6
                      }}>
                        No photo on file
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: "0 0 6px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: COLORS.textDark
                    }}>
                      {selected.full_name}
                    </p>
                    <Row label="National ID" value={selected.national_id || "—"} />
                    <Row label="Email" value={selected.email || "—"} />
                    <Row label="Phone" value={selected.phone || "—"} />
                    <Row
                      label="Submitted"
                      value={new Date(selected.submitted_at).toLocaleString()}
                    />
                  </div>
                </div>

                {/* Submitted information */}
                <h3 style={subHeading}>Submitted information</h3>
                {detailValues.length === 0 && (
                  <p style={{ fontSize: 12, color: COLORS.textMuted }}>None</p>
                )}
                {detailValues.map(v => (
                  <Row
                    key={v.field_key}
                    label={v.field_key.replace(/_/g, " ")}
                    value={v.field_value}
                  />
                ))}

                {/* Documents */}
                {detailDocs.length > 0 && (
                  <>
                    <h3 style={subHeading}>Documents</h3>
                    <ul style={{ paddingLeft: 18, fontSize: 13, margin: 0 }}>
                      {detailDocs.map(d => (
                        <li key={d.document_id} style={{ marginBottom: 4 }}>
                          <a
                            href={`${API_BASE.replace("/api", "")}${d.storage_path}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: COLORS.blue, wordBreak: "break-all" }}
                          >
                            {d.original_filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* History */}
                <h3 style={subHeading}>History</h3>
                {detailHistory.length === 0 && (
                  <p style={{ fontSize: 12, color: COLORS.textMuted }}>None</p>
                )}
                {detailHistory.map((h, i) => (
                  <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                    <strong>{h.action}</strong>{" "}
                    <small style={{ color: COLORS.textMuted }}>
                      {new Date(h.created_at).toLocaleString()}
                    </small>
                  </div>
                ))}

                {/* Update status */}
                <h3 style={subHeading}>Update status</h3>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional note for the citizen"
                  rows={2}
                  style={{ ...inputStyle, marginBottom: 10 }}
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    ["under_review", "Under review", COLORS.blue],
                    ["more_information_required", "Request info", "#b45309"],
                    ["awaiting_payment", "Awaiting payment", "#b45309"],
                    ["payment_verified", "Payment verified", COLORS.green],
                    ["approved", "Approve", COLORS.green],
                    ["ready_for_collection", "Ready", COLORS.green],
                    ["completed", "Complete", COLORS.green],
                    ["rejected", "Reject", COLORS.error]
                  ].map(([key, label, bg]) => (
                    <button
                      key={key}
                      disabled={updating}
                      onClick={() => setStatus(key)}
                      style={{
                        padding: "8px 12px",
                        border: 0,
                        background: bg,
                        color: "#fff",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: updating ? "wait" : "pointer",
                        fontFamily: "inherit"
                      }}
                    >
                      {label}
                    </button>
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

// ============================================================
// SUB-COMPONENTS
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
      borderBottom: `1px solid ${COLORS.borderLight}`,
      gap: 12
    }}>
      <span style={{
        color: COLORS.textMuted,
        textTransform: "capitalize",
        whiteSpace: "nowrap"
      }}>
        {label}
      </span>
      <span style={{
        color: COLORS.textDark,
        fontWeight: 600,
        textAlign: "right",
        wordBreak: "break-word",
        minWidth: 0
      }}>
        {value}
      </span>
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
      display: "inline-block",
      padding: "3px 10px",
      background: s.bg,
      color: s.fg,
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      whiteSpace: "nowrap"
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const subHeading = {
  fontSize: 12,
  color: COLORS.textMuted,
  textTransform: "uppercase",
  marginTop: 18,
  marginBottom: 6,
  letterSpacing: 0.6,
  fontWeight: 700
};

const thStyle = {
  padding: "10px 12px 10px 0",
  textAlign: "left",
  fontSize: 11,
  textTransform: "uppercase",
  color: COLORS.textMuted,
  fontWeight: 700,
  borderBottom: `1px solid ${COLORS.borderLight}`,
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "12px 12px 12px 0",
  fontSize: 13,
  color: COLORS.textMid,
  borderBottom: `1px solid ${COLORS.borderLight}`,
  verticalAlign: "middle"
};

const linkBtn = {
  border: 0,
  background: "transparent",
  color: COLORS.blue,
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit"
};

const selectStyle = {
  padding: "8px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "inherit",
  background: "#fff",
  outline: "none"
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box"
};

export default HomeAffairsDashboardAdmin;
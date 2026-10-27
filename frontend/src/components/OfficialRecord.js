import React from "react";
import arms from "../dashboards/arms.png";

const ink = "#172b4d";
const blue = "#123b75";

function prettyLabel(value = "") {
  return String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function documentTitle(doc) {
  const filename = (doc.original_filename || doc.filename || "").replace(/^\d+_/, "");
  const match = filename.match(/__(.+?)__/);
  const category = match?.[1] || filename.replace(/\.[^.]+$/, "");
  return prettyLabel(category.replace(/^(birth|passport|traffic|police)_/, "")) || "Supporting document";
}

function DocumentCard({ doc, baseUrl, actions }) {
  const href = `${baseUrl}${doc.storage_path || doc.url || ""}`;
  const mime = doc.mime_type || doc.mimetype || "";
  const image = mime.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(href);
  const pdf = mime.includes("pdf") || /\.pdf$/i.test(href);
  const size = Number(doc.file_size || doc.file_size_bytes || doc.size_bytes || doc.size || 0);
  return (
    <article style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr)", gap: 14,
      padding: 12, border: "1px solid #d7dee8", borderRadius: 8, background: "#fff" }}>
      <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${documentTitle(doc)}`}
        style={{ height: 76, display: "grid", placeItems: "center", overflow: "hidden",
          background: "#f3f6fa", borderRadius: 5, border: "1px solid #e1e7ef", color: blue,
          textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
        {image ? <img src={href} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : pdf ? "PDF DOCUMENT" : "FILE"}
      </a>
      <div style={{ minWidth: 0, alignSelf: "center" }}>
        <div style={{ fontSize: 13, color: ink, fontWeight: 700 }}>{documentTitle(doc)}</div>
        <div style={{ marginTop: 4, color: "#64748b", fontSize: 11, wordBreak: "break-word" }}>
          {doc.original_filename || doc.filename || "Uploaded file"}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 7 }}>
          <a href={href} target="_blank" rel="noreferrer" style={{ color: blue, fontSize: 11, fontWeight: 700 }}>View document ↗</a>
          {size > 0 && <span style={{ color: "#64748b", fontSize: 10 }}>{size > 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`}</span>}
          {actions}
        </div>
      </div>
    </article>
  );
}

export function OfficialFields({ values = [], title = "Application particulars" }) {
  if (!values.length) return null;
  return <section style={{ margin: "14px 0" }}>
    <h3 style={{ margin: "0 0 9px", color: blue, fontSize: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>{title}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", border: "1px solid #d7dee8", borderRadius: 8, overflow: "hidden" }}>
      {values.map((value, index) => <div key={value.field_key || index} style={{ padding: "10px 12px", borderBottom: "1px solid #e7ebf0", background: index % 2 ? "#fff" : "#f8fafc" }}>
        <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{prettyLabel(value.field_key || value.label || "Detail")}</div>
        <div style={{ color: ink, fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{value.field_value || value.value || "—"}</div>
      </div>)}
    </div>
  </section>;
}

export default function OfficialDocuments({ documents = [], baseUrl = "", title = "Supporting documents", actionsFor }) {
  if (!documents.length) return null;
  return <section style={{ margin: "16px 0", border: "1px solid #d7dee8", borderRadius: 9, overflow: "hidden", background: "#fff" }}>
    <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "#f3f6fa", borderBottom: "3px solid #123b75" }}>
      <img src={arms} alt="National coat of arms" style={{ width: 31, height: 31, objectFit: "contain" }} />
      <div><div style={{ color: blue, fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Kingdom of Lesotho</div>
        <div style={{ color: ink, fontSize: 13, fontWeight: 700 }}>{title}</div></div>
      <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 10 }}>{documents.length} file{documents.length === 1 ? "" : "s"}</span>
    </header>
    <div style={{ display: "grid", gap: 9, padding: 12 }}>
      {documents.map((doc, index) => <DocumentCard key={doc.document_id || doc.evidence_id || doc.id || index}
        doc={doc} baseUrl={baseUrl} actions={actionsFor ? actionsFor(doc) : null} />)}
    </div>
  </section>;
}

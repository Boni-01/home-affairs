import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import Navbar from "../components/Navbar";
import { auth, API_BASE } from "../Database/firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ============================================================
// API helper
// ============================================================
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

const ANNOUNCEMENTS = [
  {
    id: "online-service",
    image: "/online-service.png",
    title: "Apply for your National ID online",
    body:
      "You can now apply for a new National ID, renew your card, or report a lost or damaged ID through our online platform. It's quick, secure and convenient – no need to visit an office."
  },
  {
    id: "security",
    image: "/security.png",
    title: "Your identity is protected with two-factor verification",
    body:
      "We use two-factor verification to keep your personal information safe and secure. Your data is always in your control."
  },
  {
    id: "community",
    image: "/community.png",
    title: "Become a civil registration volunteer",
    body:
      "Help your community by supporting civil registration services. Make a difference and contribute to a stronger Lesotho."
  }
];

// ============================================================
// SERVICE ICON MAP
// ============================================================
const SERVICE_ICONS = {
  // Birth
  "birth certificate":            "/birthc.png",
  "birth registration":           "/birthr.png",
  "late birth registration":      "/latebirth.png",
  "late birth":                   "/latebirth.png",

  // Death
  "death certificate":            "/deathc.png",
  "death registration":           "/deathr.png",

  // Marriage
  "marriage certificate":         "/marriagec.png",
  "marriage registration":        "/marriager.png",

  // Civil / Name
  "civil record":                 "/civil.png",
  "civil record amendment":       "/civil.png",
  "civil registration":           "/civil.png",
  "name and surname change":      "/namec.png",
  "name change":                  "/namec.png",

  // National ID variants (longer keys first)
  "national id - correction":     "/correctionID.png",
  "national id correction":       "/correctionID.png",
  "national id - lost":           "/lostID.png",
  "national id lost or damaged":  "/lostID.png",
  "national id - new":            "/newID.png",
  "national id new":              "/newID.png",
  "national id - renewal":        "/renewalID.png",
  "national id renewal":          "/renewalID.png",

  // Fallbacks
  "new id":                       "/newID.png",
  "renewal":                      "/renewalID.png",
  "lost id":                      "/lostID.png",
  "correction":                   "/correctionID.png",

  // Verification
  "verify a record":              "/verify.png",
  "verification":                 "/verify.png",
  "verify":                       "/verify.png"
};

function getServiceIcon(serviceName) {
  if (!serviceName) return "/verify.png";
  const key = serviceName
    .toLowerCase()
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (SERVICE_ICONS[key]) return SERVICE_ICONS[key];

  let best = null;
  for (const [needle, icon] of Object.entries(SERVICE_ICONS)) {
    if (key.includes(needle)) {
      if (!best || needle.length > best.needle.length) {
        best = { needle, icon };
      }
    }
  }
  return best ? best.icon : "/verify.png";
}

// ============================================================
// TRANSLATIONS
// ============================================================
const TRANSLATIONS = {
  en: {
    home: "Home",
    language: "Language",
    searchPlaceholder: "Search for an article or service",
    serviceCatalogue: "Service catalogue",
    articles: "ARTICLES",
    generalInfo: "General information",
    logout: "Logout",
    welcome: "Welcome",
    nationalId: "National ID",
    activeApplications: "Active applications",
    readyForCollection: "Ready for collection",
    notifications: "Notifications",
    applyTab: "Apply",

    availableServices: "Available services",
    availableServicesDesc: "Select a service to start an application.",
    announcements: "Announcements",
    announcementsDesc: "Latest news and updates from the Department of Home Affairs.",
    noServices: "No services in this module.",
    startApplication: "Start application",
    days: "days",
    feeApplies: "Fee applies",
    free: "Free",
    appointment: "Appointment",
    showingMatches: "Showing matches for",

    settings: "Settings",
    settingsDesc: "Manage your account, applications, and preferences.",
    settingsTabs: {
      profile: "Profile",
      applications: "My applications",
      documents: "Documents",
      notifications: "Notifications",
      preferences: "Preferences",
      security: "Security",
      linked: "Linked services",
      privacy: "Privacy & data"
    },

    myProfile: "My profile",
    profileDesc: "Your verified identity on the Lesotho Government Services platform.",
    profileDetails: "Profile details",
    fullName: "Full name",
    email: "Email",
    phone: "Phone",
    accountType: "Account type",
    accountStatus: "Account status",
    memberSince: "Member since",
    identityPhoto: "Identity photo",
    identityPhotoDesc:
      "Upload a clear, front-facing photo of yourself. This photo will appear on your National ID card in your profile.",
    uploadPhoto: "Upload photo",
    replacePhoto: "Replace photo",
    uploading: "Uploading…",
    noPhotoYet: "No photo yet",

    myApplications: "My applications",
    trackRequests: "Track every request you've submitted.",
    noApplications: "You have no applications yet.",
    viewDetails: "View details",
    certificate: "Certificate",
    officerNote: "Officer note",

    approvedDocuments: "Approved documents",
    approvedDocumentsDesc: "Download your approved certificates and permits.",
    noApprovedDocuments: "You have no approved documents yet.",
    download: "Download",
    searchDocuments: "Search documents…",

    updatesOnApps: "Updates on your applications.",
    markAsRead: "Mark as read",
    noNotifications: "No notifications yet.",

    preferencesTitle: "Preferences",
    preferencesDesc: "Choose how the portal looks and how we contact you.",
    prefLanguage: "Language",
    prefNotifications: "Notification channels",
    prefNotifyEmail: "Email notifications",
    prefNotifySms: "SMS notifications",
    prefNotifyApp: "In-app notifications",
    comingSoon: "Coming soon",

    securityTitle: "Security",
    securityDesc: "Protect your account with a strong password and two-factor verification.",
    changePassword: "Change password",
    changePasswordDesc: "Update your Firebase account password.",
    twoFactor: "Two-factor authentication",
    twoFactorDesc: "Receive a one-time code on your phone when signing in.",
    enable: "Enable",
    update: "Update",

    linkedTitle: "Linked services",
    linkedDesc: "Ministries and departments connected to your National ID.",
    linkedConnected: "Connected",
    linkedAvailable: "Available",

    privacyTitle: "Privacy & data",
    privacyDesc: "Control your personal data stored on this platform.",
    downloadData: "Download my data",
    downloadDataDesc: "Get a copy of everything stored about your account.",
    deleteAccount: "Request account deletion",
    deleteAccountDesc: "Permanently close your account and remove your data.",
    request: "Request",

    close: "Close",

    serviceCatalogueTitle: "Service catalogue",
    serviceCatalogueIntro: "Browse all available services. Type to highlight matches.",
    searchServices: "Search services…"
  },
  st: {
    home: "Lehae",
    language: "Puo",
    searchPlaceholder: "Batla sengoloa kapa tšebeletso",
    serviceCatalogue: "Lenane la litšebeletso",
    articles: "LINGOLOA",
    generalInfo: "Tlhahisoleseling e akaretsang",
    logout: "Tsoa",
    welcome: "Rea u amohela",
    nationalId: "Nomoro ea boitsebiso",
    activeApplications: "Likopo tse sebetsang",
    readyForCollection: "Li loketse ho nkoa",
    notifications: "Tsebiso",
    applyTab: "Etsa kopo",

    availableServices: "Litšebeletso tse fumanehang",
    availableServicesDesc: "Khetha tšebeletso ho qala kopo.",
    announcements: "Litsebiso",
    announcementsDesc: "Litaba tsa morao-rao le lintlha tse ncha ho tsoa Lefapheng la Litaba tsa Lehae.",
    noServices: "Ha ho litšebeletso tsa mojule ena.",
    startApplication: "Qala kopo",
    days: "matsatsi",
    feeApplies: "Tefiso ea sebetsa",
    free: "Mahala",
    appointment: "Nako e behiloeng",
    showingMatches: "Ho bontša liphetho tsa",

    settings: "Litlhophiso",
    settingsDesc: "Laola ak'haonte ea hau, likopo, le likhetho.",
    settingsTabs: {
      profile: "Boitsebiso",
      applications: "Likopo tsa ka",
      documents: "Litokomane",
      notifications: "Tsebiso",
      preferences: "Likhetho",
      security: "Ts'ireletso",
      linked: "Litšebeletso tse hokahantsoeng",
      privacy: "Sephiri le data"
    },

    myProfile: "Boitsebiso ba ka",
    profileDesc: "Boitsebiso ba hau bo netefalitsoeng sethaleng sa litšebeletso tsa Lesotho.",
    profileDetails: "Lintlha tsa boitsebiso",
    fullName: "Lebitso le feletseng",
    email: "Imeile",
    phone: "Mohala",
    accountType: "Mofuta oa ak'haonte",
    accountStatus: "Boemo ba ak'haonte",
    memberSince: "Setho ho tloha",
    identityPhoto: "Senepe sa boitsebiso",
    identityPhotoDesc:
      "Kenya senepe se hlakileng sa sefahlelo sa hau. Senepe sena se tla hlaha kareteng ea hau ea boitsebiso.",
    uploadPhoto: "Kenya senepe",
    replacePhoto: "Fetola senepe",
    uploading: "E kenya…",
    noPhotoYet: "Ha ho senepe",

    myApplications: "Likopo tsa ka",
    trackRequests: "Latela likopo tsohle tseo u li rometseng.",
    noApplications: "Ha u na likopo ho fihlela joale.",
    viewDetails: "Bona lintlha",
    certificate: "Setifikeiti",
    officerNote: "Tlhokomeliso ea ofisiri",

    approvedDocuments: "Litokomane tse amohetsoeng",
    approvedDocumentsDesc: "Khoasolla litifikeiti le litumello tse amohetsoeng.",
    noApprovedDocuments: "Ha u na litokomane tse amohetsoeng.",
    download: "Khoasolla",
    searchDocuments: "Batla litokomane…",

    updatesOnApps: "Tsebiso ka likopo tsa hau.",
    markAsRead: "Tšoaea e baliloeng",
    noNotifications: "Ha ho tsebiso ho fihlela joale.",

    preferencesTitle: "Likhetho",
    preferencesDesc: "Khetha hore na portal e shebahala joang le hore na re u ikopanya joang.",
    prefLanguage: "Puo",
    prefNotifications: "Likanale tsa tsebiso",
    prefNotifyEmail: "Litsebiso tsa imeile",
    prefNotifySms: "Litsebiso tsa SMS",
    prefNotifyApp: "Litsebiso tsa app",
    comingSoon: "E tla tloha",

    securityTitle: "Ts'ireletso",
    securityDesc: "Sireletsa ak'haonte ea hau ka phasewete e matla le netefatso ea mahlakore a mabeli.",
    changePassword: "Fetola phasewete",
    changePasswordDesc: "Ntlafatsa phasewete ea ak'haonte ea hau ea Firebase.",
    twoFactor: "Netefatso ea mahlakore a mabeli",
    twoFactorDesc: "Fumana khoutu ea nako e le 'ngoe foneng ea hau ha u kena.",
    enable: "Nolofa",
    update: "Ntlafatsa",

    linkedTitle: "Litšebeletso tse hokahantsoeng",
    linkedDesc: "Mafapha le litšebeletso tse hokahantsoeng le boitsebiso ba hau.",
    linkedConnected: "E hokahantsoe",
    linkedAvailable: "E fumaneha",

    privacyTitle: "Sephiri le data",
    privacyDesc: "Laola data ea hau e bolokiloeng sethaleng sena.",
    downloadData: "Khoasolla data ea ka",
    downloadDataDesc: "Fumana kopi ea tsohle tse bolokiloeng ka ak'haonte ea hau.",
    deleteAccount: "Kopa ho hlakoloa ha ak'haonte",
    deleteAccountDesc: "Koala ak'haonte ea hau ka ho sa feleng le ho tlosa data ea hau.",
    request: "Kopa",

    close: "Koala",

    serviceCatalogueTitle: "Lenane la litšebeletso",
    serviceCatalogueIntro: "Sheba litšebeletso tsohle tse fumanehang. Ngola ho totobatsa liphetho.",
    searchServices: "Batla litšebeletso…"
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
function HomeAffairsDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");
  const t = TRANSLATIONS[lang];

  const [me, setMe] = useState(null);
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeModule, setActiveModule] = useState("NICR");

  const [searchQuery, setSearchQuery] = useState("");

  const [activeService, setActiveService] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedApp, setSelectedApp] = useState(null);
  const [detail, setDetail] = useState(null);

  const [certificate, setCertificate] = useState(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const [docSearch, setDocSearch] = useState("");

  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [activeDashboardTab, setActiveDashboardTab] = useState("apply");

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
    setActiveDashboardTab("apply");
    try {
      const data = await api(`/services/${serviceId}`);
      setActiveService(data.service);
      setFields(data.fields);
      setCatalogueOpen(false);
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

  const allModuleServices = useMemo(
    () => services.filter(s => s.module === activeModule),
    [services, activeModule]
  );

  const isMatchingSearch = (svc, query) => {
    if (!query || !query.trim()) return false;
    const q = query.toLowerCase();
    return (
      (svc.service_name || "").toLowerCase().includes(q) ||
      (svc.description || "").toLowerCase().includes(q)
    );
  };

  const approvedApplications = useMemo(() => {
    const approved = applications.filter(a =>
      ["approved", "ready_for_collection", "completed"].includes(a.status)
    );
    if (!docSearch.trim()) return approved;
    const q = docSearch.toLowerCase();
    return approved.filter(a =>
      (a.reference_number || "").toLowerCase().includes(q) ||
      (a.service_type || "").toLowerCase().includes(q) ||
      (a.module || "").toLowerCase().includes(q)
    );
  }, [applications, docSearch]);

  const unread = notifications.filter(n => !n.read_at).length;
  const activeApps = applications.filter(a =>
    ["submitted", "under_review", "more_information_required", "awaiting_payment"].includes(a.status)
  ).length;
  const readyApps = applications.filter(a =>
    ["approved", "ready_for_collection", "completed"].includes(a.status)
  ).length;

  const openServiceCatalogue = () => {
    setCatalogueOpen(true);
    setCatalogueSearch(searchQuery || "");
  };

  const closeServiceCatalogue = () => {
    setCatalogueOpen(false);
    setActiveDashboardTab("apply");
  };

  function handleDashboardTabChange(tab) {
    setActiveDashboardTab(tab);
    if (tab === "catalogue") {
      setSettingsOpen(false);
      openServiceCatalogue();
      return;
    }
    if (tab === "apply") {
      setSettingsOpen(false);
      return;
    }
    setSettingsTab(tab);
    setSettingsOpen(true);
  }

  function handleLogout() {
    if (onLogout) {
      onLogout();
      return;
    }
    auth.signOut().then(() => navigate("/login"));
  }

  const anyDashboardMatch =
    searchQuery.trim() && allModuleServices.some(s => isMatchingSearch(s, searchQuery));

  return (
    <main className="dashboard-page" style={layout.page}>
      <div style={layout.container}>
        <header style={header.wrapper}>
          <div style={{
            ...header.content,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap"
          }}>
            <div>
              <p style={header.eyebrow}>Department of Home Affairs</p>
              <h1 style={header.title}>
                {t.welcome}, {me?.full_name || "citizen"}
              </h1>
              {me && (
                <p style={header.subtitle}>
                  {t.nationalId}:{" "}
                  <strong>{me.national_id_number || me.national_id || "—"}</strong>
                </p>
              )}
            </div>

            <div style={headerActions}>
              <div style={searchWrapper}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  style={searchInput}
                />
                <button style={searchButton} aria-label="Search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                </button>
              </div>

            </div>
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
          <StatCard label={t.activeApplications} value={activeApps} accent={COLORS.blue} />
          <StatCard label={t.readyForCollection} value={readyApps} accent={COLORS.green} />
          <StatCard label={t.notifications} value={unread} accent={COLORS.blue} />
        </section>

        <Navbar
          items={[
            ["apply", t.applyTab],
            ["applications", t.settingsTabs.applications],
            ["notifications", `${t.settingsTabs.notifications}${unread ? ` (${unread})` : ""}`],
            ["profile", t.settingsTabs.profile],
            ["catalogue", t.serviceCatalogue]
          ]}
          activeTab={activeDashboardTab}
          onTabChange={handleDashboardTabChange}
          action={{ label: t.logout, onClick: handleLogout }}
          user={me}
        />

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
          <h2 style={section.title}>{t.availableServices}</h2>
          <p style={section.subtitle}>{t.availableServicesDesc}</p>

          {anyDashboardMatch && (
            <p style={{
              margin: "0 0 12px", fontSize: 12,
              color: COLORS.blue, fontWeight: 600
            }}>
              {t.showingMatches} "{searchQuery}"
            </p>
          )}

          <div style={cardsGrid}>
            {allModuleServices.map(svc => {
              const highlighted = isMatchingSearch(svc, searchQuery);
              return (
                <article
                  key={svc.service_id}
                  onClick={() => openService(svc.service_id)}
                  style={{
                    ...cardStyle,
                    ...(highlighted ? cardHighlighted : {})
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = highlighted
                      ? "0 0 0 3px rgba(0,32,159,0.20), 0 12px 28px rgba(0,32,159,0.20)"
                      : "0 12px 28px rgba(0,32,159,0.12)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = highlighted
                      ? "0 0 0 3px rgba(0,32,159,0.15), 0 12px 28px rgba(0,32,159,0.15)"
                      : "0 2px 8px rgba(0,32,159,0.05)";
                  }}
                >
                  <div style={cardIconBox}>
                    <img
                      src={getServiceIcon(svc.service_name)}
                      alt={svc.service_name}
                      style={cardIconImg}
                      onError={(e) => { e.target.src = "/verify.png"; }}
                    />
                  </div>

                  <div style={cardContent}>
                    <h3 style={cardTitle}>{svc.service_name}</h3>
                    <span style={cardChip}>{svc.module}</span>
                    <div style={cardMeta}>
                      <span><strong>{svc.processing_days}</strong> {t.days}</span>
                      {svc.requires_payment
                        ? <span>· {t.feeApplies}</span>
                        : <span>· {t.free}</span>}
                      {svc.requires_appointment
                        ? <span>· {t.appointment}</span>
                        : null}
                    </div>
                  </div>
                </article>
              );
            })}
            {allModuleServices.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                {t.noServices}
              </p>
            )}
          </div>
        </section>

        <section style={{ ...section.wrapper, marginTop: 32 }}>
          <h2 style={section.title}>{t.announcements}</h2>
          <p style={section.subtitle}>{t.announcementsDesc}</p>

          <div style={cardsGrid}>
            {ANNOUNCEMENTS.map(a => (
              <article key={a.id} style={announceCardStyle}>
                <img
                  src={a.image}
                  alt={a.title}
                  style={announceImage}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div style={announceBody}>
                  <h3 style={announceTitle}>{a.title}</h3>
                  <p style={announceText}>{a.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* SERVICE FORM */}
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

      {/* APPLICATION DETAILS */}
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
            <ProfileRow label={t.officerNote} value={selectedApp.decision_notes} />
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

      {/* CERTIFICATE */}
      {certificate && (
        <Overlay onClose={() => setCertificate(null)}>
          <CertificateView data={certificate} onClose={() => setCertificate(null)} />
        </Overlay>
      )}

      {/* SERVICE CATALOGUE MODAL */}
      {catalogueOpen && (
        <Overlay onClose={closeServiceCatalogue}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {t.serviceCatalogueTitle}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textMuted }}>
            {t.serviceCatalogueIntro}
          </p>

          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={catalogueSearch}
              onChange={(e) => setCatalogueSearch(e.target.value)}
              placeholder={t.searchServices}
              style={docSearchInput}
            />
          </div>

          {catalogueSearch.trim() && (
            <p style={{
              margin: "0 0 12px", fontSize: 12,
              color: COLORS.blue, fontWeight: 600
            }}>
              {t.showingMatches} "{catalogueSearch}"
            </p>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14
          }}>
            {services.length === 0 && (
              <div style={{
                gridColumn: "1 / -1", padding: 30, textAlign: "center",
                background: "#F4F7FB", border: `1px dashed ${COLORS.border}`,
                borderRadius: 10, color: COLORS.textMuted, fontSize: 13
              }}>{t.noServices}</div>
            )}
            {services.map(svc => {
              const highlighted = isMatchingSearch(svc, catalogueSearch);
              return (
                <article
                  key={svc.service_id}
                  onClick={() => openService(svc.service_id)}
                  style={{
                    ...cardStyle,
                    ...(highlighted ? cardHighlighted : {})
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = highlighted
                      ? "0 0 0 3px rgba(0,32,159,0.20), 0 12px 28px rgba(0,32,159,0.20)"
                      : "0 12px 28px rgba(0,32,159,0.12)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = highlighted
                      ? "0 0 0 3px rgba(0,32,159,0.15), 0 12px 28px rgba(0,32,159,0.15)"
                      : "0 2px 8px rgba(0,32,159,0.05)";
                  }}
                >
                  <div style={cardIconBox}>
                    <img
                      src={getServiceIcon(svc.service_name)}
                      alt={svc.service_name}
                      style={cardIconImg}
                      onError={(e) => { e.target.src = "/verify.png"; }}
                    />
                  </div>
                  <div style={cardContent}>
                    <h3 style={cardTitle}>{svc.service_name}</h3>
                    <span style={cardChip}>{svc.module}</span>
                    <div style={cardMeta}>
                      <span><strong>{svc.processing_days}</strong> {t.days}</span>
                      {svc.requires_payment
                        ? <span>· {t.feeApplies}</span>
                        : <span>· {t.free}</span>}
                      {svc.requires_appointment
                        ? <span>· {t.appointment}</span>
                        : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div style={{ textAlign: "right", marginTop: 22 }}>
            <button onClick={closeServiceCatalogue} style={btnPrimary}>
              {t.close}
            </button>
          </div>
        </Overlay>
      )}

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <SettingsModal
          t={t}
          lang={lang}
          setLang={setLang}
          me={me}
          applications={applications}
          notifications={notifications}
          approvedApplications={approvedApplications}
          docSearch={docSearch}
          setDocSearch={setDocSearch}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          onClose={() => {
            setSettingsOpen(false);
            setActiveDashboardTab("apply");
          }}
          photoInputRef={photoInputRef}
          photoUploading={photoUploading}
          photoError={photoError}
          handlePhotoUpload={handlePhotoUpload}
          openDetail={openDetail}
          viewCertificate={viewCertificate}
          markRead={markRead}
        />
      )}
    </main>
  );
}

// ============================================================
// SETTINGS MODAL
// ============================================================
function SettingsModal({
  t, lang, setLang, me,
  applications, notifications, approvedApplications,
  docSearch, setDocSearch,
  settingsTab, setSettingsTab,
  onClose,
  photoInputRef, photoUploading, photoError, handlePhotoUpload,
  openDetail, viewCertificate, markRead
}) {
  const tabs = [
    ["profile", t.settingsTabs.profile],
    ["applications", t.settingsTabs.applications],
    ["documents", t.settingsTabs.documents],
    ["notifications", t.settingsTabs.notifications],
    ["preferences", t.settingsTabs.preferences],
    ["security", t.settingsTabs.security],
    ["linked", t.settingsTabs.linked],
    ["privacy", t.settingsTabs.privacy]
  ];

  const unread = notifications.filter(n => !n.read_at).length;

  return (
    <div onClick={onClose} style={settingsOverlay}>
      <div onClick={e => e.stopPropagation()} style={settingsPanel}>
        <div style={settingsHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/settings.png"
              alt=""
              style={{ height: 22, width: 22, objectFit: "contain" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: COLORS.blue }}>
                {t.settings}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                {t.settingsDesc}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={settingsCloseBtn}>✕</button>
        </div>

        <div style={settingsTabsRow}>
          {tabs.map(([key, label]) => {
            const badge = key === "notifications" && unread ? ` (${unread})` : "";
            return (
              <button
                key={key}
                onClick={() => setSettingsTab(key)}
                style={{
                  ...settingsTabBtn,
                  ...(settingsTab === key ? settingsTabBtnActive : {})
                }}
              >
                {label}{badge}
              </button>
            );
          })}
        </div>

        <div style={settingsBody}>
          {settingsTab === "profile" && me && (
            <>
              <h3 style={settingsSectionTitle}>{t.myProfile}</h3>
              <p style={settingsSectionDesc}>{t.profileDesc}</p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
                gap: 20, marginTop: 16
              }}>
                <div style={{
                  background: `linear-gradient(135deg, ${COLORS.blue} 0%, #001a80 100%)`,
                  color: "#fff", borderRadius: 12, padding: 22,
                  aspectRatio: "85/54", maxWidth: 420,
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
                    <div style={{
                      width: 72, height: 92, borderRadius: 4,
                      background: "rgba(255,255,255,0.12)",
                      display: "grid", placeItems: "center",
                      overflow: "hidden",
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
                    <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>
                      ID NUMBER
                    </p>
                    <p style={{
                      margin: "2px 0 10px", fontSize: 16, fontWeight: 700,
                      letterSpacing: 1.4, fontFamily: "Consolas, monospace"
                    }}>{me.national_id_number || me.national_id || "—"}</p>
                    <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>
                      NAME
                    </p>
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

                <div>
                  <div style={settingsCard}>
                    <h4 style={settingsCardTitle}>{t.profileDetails}</h4>
                    <ProfileRow label={t.fullName} value={me.full_name} />
                    <ProfileRow label={t.email} value={me.email || "—"} />
                    <ProfileRow label={t.phone} value={me.phone || "—"} />
                    <ProfileRow label={t.nationalId} value={me.national_id_number || me.national_id || "—"} />
                    <ProfileRow label={t.accountType} value={me.account_type} />
                    <ProfileRow label={t.accountStatus} value={me.account_status} />
                    <ProfileRow label={t.memberSince} value={new Date(me.created_at).toLocaleDateString()} />
                  </div>

                  <div style={settingsCard}>
                    <h4 style={settingsCardTitle}>{t.identityPhoto}</h4>
                    <p style={{
                      margin: "0 0 14px", fontSize: 12,
                      color: COLORS.textMuted, lineHeight: 1.5
                    }}>{t.identityPhotoDesc}</p>

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
                          }}>{t.noPhotoYet}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={handlePhotoUpload}
                          style={{ display: "none" }}
                          id="settings-photo-upload"
                        />
                        <label
                          htmlFor="settings-photo-upload"
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
                          {photoUploading ? t.uploading :
                            me.photo_url ? t.replacePhoto : t.uploadPhoto}
                        </label>
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
            </>
          )}

          {settingsTab === "applications" && (
            <>
              <h3 style={settingsSectionTitle}>{t.myApplications}</h3>
              <p style={settingsSectionDesc}>{t.trackRequests}</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 16, marginTop: 16
              }}>
                {applications.length === 0 && (
                  <div style={{
                    gridColumn: "1 / -1", padding: 40, textAlign: "center",
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, color: COLORS.textMuted, fontSize: 13
                  }}>{t.noApplications}</div>
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
                        fontFamily: "Consolas, monospace"
                      }}>{a.reference_number}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, color: COLORS.textDark }}>
                      {a.service_type}
                    </h3>
                    <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.textMuted }}>
                      {a.module} · Submitted {new Date(a.submitted_at).toLocaleDateString()}
                    </p>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button onClick={() => openDetail(a.application_id)} style={btnOutline}>
                        {t.viewDetails}
                      </button>
                      {["approved", "ready_for_collection", "completed"].includes(a.status) && (
                        <button onClick={() => viewCertificate(a.application_id)} style={btnPrimary}>
                          {t.certificate}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {settingsTab === "documents" && (
            <>
              <h3 style={settingsSectionTitle}>{t.approvedDocuments}</h3>
              <p style={settingsSectionDesc}>{t.approvedDocumentsDesc}</p>
              <div style={{ marginBottom: 16, marginTop: 12 }}>
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder={t.searchDocuments}
                  style={docSearchInput}
                />
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16
              }}>
                {approvedApplications.length === 0 && (
                  <div style={{
                    gridColumn: "1 / -1", padding: 40, textAlign: "center",
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, color: COLORS.textMuted, fontSize: 13
                  }}>{t.noApprovedDocuments}</div>
                )}
                {approvedApplications.map(a => (
                  <article key={a.application_id} style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 20,
                    boxShadow: "0 2px 8px rgba(0,32,159,0.05)",
                    display: "flex", flexDirection: "column"
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 10
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: COLORS.blue,
                        fontFamily: "Consolas, monospace"
                      }}>{a.reference_number}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, color: COLORS.textDark }}>
                      {a.service_type}
                    </h3>
                    <p style={{
                      margin: "0 0 16px", fontSize: 12,
                      color: COLORS.textMuted, flexGrow: 1
                    }}>
                      {a.module} · Approved{" "}
                      {a.decision_at
                        ? new Date(a.decision_at).toLocaleDateString()
                        : new Date(a.submitted_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => viewCertificate(a.application_id)}
                      style={btnPrimary}
                    >
                      {t.download}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {settingsTab === "notifications" && (
            <>
              <h3 style={settingsSectionTitle}>{t.notifications}</h3>
              <p style={settingsSectionDesc}>{t.updatesOnApps}</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 12, marginTop: 16
              }}>
                {notifications.length === 0 && (
                  <div style={{
                    gridColumn: "1 / -1", padding: 40, textAlign: "center",
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, color: COLORS.textMuted, fontSize: 13
                  }}>{t.noNotifications}</div>
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
                      }}>{t.markAsRead}</button>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}

          {settingsTab === "preferences" && (
            <>
              <h3 style={settingsSectionTitle}>{t.preferencesTitle}</h3>
              <p style={settingsSectionDesc}>{t.preferencesDesc}</p>
              <div style={settingsCard}>
                <h4 style={settingsCardTitle}>{t.prefLanguage}</h4>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={{ ...settingsInput, maxWidth: 260 }}
                >
                  <option value="en">English (ENG)</option>
                  <option value="st">Sesotho (SES)</option>
                </select>
              </div>
              <div style={settingsCard}>
                <h4 style={settingsCardTitle}>{t.prefNotifications}</h4>
                <ToggleRow label={t.prefNotifyEmail} defaultChecked />
                <ToggleRow label={t.prefNotifySms} defaultChecked />
                <ToggleRow label={t.prefNotifyApp} defaultChecked />
                <p style={comingSoonNote}>{t.comingSoon}</p>
              </div>
            </>
          )}

          {settingsTab === "security" && (
            <>
              <h3 style={settingsSectionTitle}>{t.securityTitle}</h3>
              <p style={settingsSectionDesc}>{t.securityDesc}</p>
              <div style={settingsCard}>
                <h4 style={settingsCardTitle}>{t.changePassword}</h4>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                  {t.changePasswordDesc}
                </p>
                <button style={btnPrimary} disabled title={t.comingSoon}>
                  {t.update}
                </button>
                <p style={comingSoonNote}>{t.comingSoon}</p>
              </div>
              <div style={settingsCard}>
                <h4 style={settingsCardTitle}>{t.twoFactor}</h4>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                  {t.twoFactorDesc}
                </p>
                <button style={btnPrimary} disabled title={t.comingSoon}>
                  {t.enable}
                </button>
                <p style={comingSoonNote}>{t.comingSoon}</p>
              </div>
            </>
          )}

          {settingsTab === "linked" && (
            <>
              <h3 style={settingsSectionTitle}>{t.linkedTitle}</h3>
              <p style={settingsSectionDesc}>{t.linkedDesc}</p>
              <div style={settingsCard}>
                <LinkedRow label="Home Affairs" status={t.linkedConnected} connected />
                <LinkedRow label="Passport Services" status={t.linkedConnected} connected />
                <LinkedRow label="Traffic & Transport" status={t.linkedConnected} connected />
                <LinkedRow label="Finance" status={t.linkedAvailable} />
                <LinkedRow label="Pensions" status={t.linkedAvailable} />
                <LinkedRow label="Police Services" status={t.linkedAvailable} />
              </div>
            </>
          )}

          {settingsTab === "privacy" && (
            <>
              <h3 style={settingsSectionTitle}>{t.privacyTitle}</h3>
              <p style={settingsSectionDesc}>{t.privacyDesc}</p>
              <div style={settingsCard}>
                <h4 style={settingsCardTitle}>{t.downloadData}</h4>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                  {t.downloadDataDesc}
                </p>
                <button style={btnOutline} disabled title={t.comingSoon}>
                  {t.download}
                </button>
                <p style={comingSoonNote}>{t.comingSoon}</p>
              </div>
              <div style={settingsCard}>
                <h4 style={{ ...settingsCardTitle, color: "#b3261e" }}>
                  {t.deleteAccount}
                </h4>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
                  {t.deleteAccountDesc}
                </p>
                <button
                  style={{ ...btnOutline, color: "#b3261e", borderColor: "#b3261e" }}
                  disabled
                  title={t.comingSoon}
                >
                  {t.request}
                </button>
                <p style={comingSoonNote}>{t.comingSoon}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "center", padding: "10px 0",
      borderBottom: `1px solid ${COLORS.borderLight}`
    }}>
      <span style={{ fontSize: 13, color: COLORS.textDark }}>{label}</span>
      <button
        onClick={() => setOn(v => !v)}
        style={{
          width: 40, height: 22, borderRadius: 999,
          border: 0, cursor: "pointer",
          background: on ? COLORS.blue : "#CBD5E1",
          position: "relative", transition: "background 0.15s"
        }}
        aria-pressed={on}
      >
        <span style={{
          position: "absolute", top: 2,
          left: on ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff", transition: "left 0.15s"
        }} />
      </button>
    </div>
  );
}

function LinkedRow({ label, status, connected }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "center", padding: "10px 0",
      borderBottom: `1px solid ${COLORS.borderLight}`
    }}>
      <span style={{ fontSize: 13, color: COLORS.textDark }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        padding: "3px 10px", borderRadius: 999,
        background: connected ? "#e6f6ee" : "#eef2f7",
        color: connected ? "#007a36" : COLORS.textMuted
      }}>{status}</span>
    </div>
  );
}

// ============================================================
// LAYOUT STYLES
// ============================================================
const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flex: "1 1 320px",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  minWidth: 0
};

const searchWrapper = {
  display: "flex",
  alignItems: "center",
  width: 320,
  maxWidth: "100%",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  overflow: "hidden",
  background: "#fff",
  height: 42,
  flex: "1 1 240px"
};
const searchInput = {
  flex: 1, border: 0, outline: "none",
  fontSize: 14, padding: "0 12px", height: "100%",
  fontFamily: "inherit", color: COLORS.textDark, background: "#fff",
  minWidth: 0
};
const searchButton = {
  background: COLORS.blue, border: 0, width: 44,
  height: "100%", display: "grid", placeItems: "center",
  cursor: "pointer"
};

const docSearchInput = {
  width: "100%", maxWidth: 420,
  padding: "10px 14px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6, fontSize: 13,
  fontFamily: "inherit", outline: "none", background: "#fff"
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14
};

const cardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  background: "#fff",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,32,159,0.05)",
  transition: "transform 0.15s, box-shadow 0.15s",
  minWidth: 0
};

const cardHighlighted = {
  border: `2px solid ${COLORS.blue}`,
  boxShadow: "0 0 0 3px rgba(0,32,159,0.15), 0 12px 28px rgba(0,32,159,0.15)",
  background: "#F0F5FF"
};

const cardIconBox = {
  width: 56,
  height: 56,
  borderRadius: 8,
  background: "#EAF2FB",
  display: "grid",
  placeItems: "center",
  flexShrink: 0
};

const cardIconImg = {
  width: 32,
  height: 32,
  objectFit: "contain"
};

const cardContent = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
  flex: 1
};

const cardTitle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: "#1B3A8C",
  lineHeight: 1.25
};

const cardChip = {
  display: "inline-block",
  alignSelf: "flex-start",
  padding: "2px 10px",
  borderRadius: 999,
  background: "#EAF2FB",
  color: "#1B3A8C",
  fontSize: 11,
  fontWeight: 600
};

const cardMeta = {
  fontSize: 11,
  color: COLORS.textMuted,
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  marginTop: 2
};

const announceCardStyle = {
  background: "#fff",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,32,159,0.05)",
  display: "flex",
  flexDirection: "column",
  minWidth: 0
};

const announceImage = {
  display: "block",
  width: "100%",
  height: 170,
  objectFit: "cover",
  background: "#EAF2FB"
};

const announceBody = {
  padding: "16px 18px 18px"
};

const announceTitle = {
  margin: "0 0 8px",
  fontSize: 16,
  fontWeight: 700,
  color: "#1B3A8C",
  lineHeight: 1.3
};

const announceText = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
  color: COLORS.textMid
};

const settingsOverlay = {
  position: "fixed", inset: 0, zIndex: 1500,
  background: "rgba(15,23,42,0.55)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 24
};

const settingsPanel = {
  background: "#fff",
  borderRadius: 14,
  width: "100%",
  maxWidth: 1040,
  maxHeight: "92vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 24px 70px rgba(0,32,159,0.35)",
  fontFamily: "Arial, Helvetica, sans-serif"
};

const settingsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "18px 22px",
  borderBottom: `1px solid ${COLORS.border}`,
  background: "#fff"
};

const settingsCloseBtn = {
  background: "transparent",
  border: 0,
  fontSize: 20,
  color: COLORS.textMuted,
  cursor: "pointer",
  padding: 0,
  lineHeight: 1
};

const settingsTabsRow = {
  display: "flex",
  gap: 4,
  padding: "0 22px",
  borderBottom: `1px solid ${COLORS.border}`,
  flexWrap: "wrap"
};

const settingsTabBtn = {
  padding: "12px 16px",
  border: 0,
  background: "transparent",
  borderBottom: `3px solid transparent`,
  color: COLORS.textMid,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit"
};

const settingsTabBtnActive = {
  color: COLORS.blue,
  borderBottom: `3px solid ${COLORS.blue}`
};

const settingsBody = {
  padding: "22px 26px 26px",
  overflowY: "auto",
  background: "#F8FAFD"
};

const settingsSectionTitle = {
  margin: "0 0 4px",
  fontSize: 20,
  fontWeight: 700,
  color: COLORS.blue
};

const settingsSectionDesc = {
  margin: "0 0 8px",
  fontSize: 13,
  color: COLORS.textMuted,
  lineHeight: 1.5
};

const settingsCard = {
  background: "#fff",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 20,
  marginBottom: 16
};

const settingsCardTitle = {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 700,
  color: COLORS.blue
};

const settingsInput = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "#fff"
};

const comingSoonNote = {
  margin: "10px 0 0",
  fontSize: 11,
  color: COLORS.textMuted,
  fontStyle: "italic"
};

// ============================================================
// SHARED SUB-COMPONENTS
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
      position: "fixed", inset: 0, zIndex: 1300,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 28,
        maxWidth: 900, width: "100%", maxHeight: "90vh",
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
    submitted: { bg: "#e6ebf9", fg: "#00209F" },
    under_review: { bg: "#fff4df", fg: "#b45309" },
    more_information_required: { bg: "#fff4df", fg: "#b45309" },
    awaiting_payment: { bg: "#fff4df", fg: "#b45309" },
    payment_verified: { bg: "#e6f6ee", fg: "#007a36" },
    approved: { bg: "#e6f6ee", fg: "#007a36" },
    ready_for_collection: { bg: "#e6f6ee", fg: "#007a36" },
    completed: { bg: "#e6f6ee", fg: "#007a36" },
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
// CERTIFICATES
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
          margin: "0 0 16px", textAlign: "center"
        }}>{subjectName}</p>
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

        <p style={{ fontSize: 12, color: COLORS.textMuted }}>
          <strong>Permit No:</strong> {application.reference_number}
        </p>
        <p style={{ fontSize: 12, color: COLORS.textMuted }}>
          <strong>Holder:</strong> {application.full_name}
        </p>

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

        <p style={{ marginTop: 20, fontSize: 13 }}>
          <strong>Reference:</strong> {application.reference_number}
        </p>
        <p style={{ fontSize: 13 }}>
          <strong>Owner:</strong> {application.full_name}
        </p>

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
        <p style={{ fontSize: 13, margin: 0 }}>
          <strong>Issued to:</strong> {application.full_name}
        </p>
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
// SHARED BUTTONS
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
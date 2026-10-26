import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
import DashboardSearch from "../components/DashboardSearch";
import Navbar from "../components/Navbar";
import { auth, API_BASE } from "../Database/firebase";
import CollectionCentreReferral from "../components/CollectionCentreReferral";

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

function dateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

const MODULES = [
  { key: "NICR", label: "Civil Registration" },
  { key: "IMMIGRATION", label: "Immigration" },
  { key: "LRMIS", label: "Livestock" }
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
  "national id":                  "/newID.png",

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

const REMOVED_NICR_SERVICE_CODES = new Set([
  "NICR_BIRTH_REG",
  "NICR_DEATH_REG",
  "NICR_LATE_BIRTH",
  "NICR_MARRIAGE_REG",
  "NICR_CIVIL_AMEND",
  "NICR_VERIFY"
]);

const NATIONAL_ID_SERVICE_CODES = new Set([
  "NICR_ID_NEW",
  "NICR_ID_RENEW",
  "NICR_ID_LOST",
  "NICR_ID_CORRECT",
  "NICR_NAME_CHANGE"
]);

const BIRTH_CERTIFICATE_EXTRA_FIELDS = {
  Lost: [
    { field_key: "lost_date", label: "Date the certificate was lost", field_type: "date", required: true },
    { field_key: "loss_details", label: "Details of how it was lost", field_type: "textarea", required: true },
    { field_key: "police_case_number", label: "Police case number (if reported)", field_type: "text", required: false }
  ],
  Damaged: [
    { field_key: "damage_date", label: "Date the certificate was damaged", field_type: "date", required: true },
    { field_key: "damage_description", label: "Describe the damage", field_type: "textarea", required: true }
  ]
};

const NATIONAL_ID_UPLOADS = {
  NICR_ID_NEW: {
    key: "__birth_certificate_image",
    label: "Birth certificate photo",
    instructions: "Upload a clear image showing the applicant's name. You must upload it before completing the ID form."
  },
  NICR_ID_RENEW: {
    key: "__old_id_image",
    label: "Photo of current National ID",
    instructions: "Upload a clear image of the old ID with its expiration date visible."
  }
};

const DAMAGED_ID_UPLOAD = {
  key: "__damaged_id_image",
  label: "Photo of damaged National ID",
  instructions: "Upload a clear image of the damaged ID showing the holder's name."
};

const DAMAGED_BIRTH_CERTIFICATE_UPLOAD = {
  key: "__damaged_birth_certificate_image",
  label: "Photo of damaged birth certificate",
  instructions: "Upload a clear image of the damaged certificate showing the holder's name."
};

function isNationalIdService(service) {
  return NATIONAL_ID_SERVICE_CODES.has(service.service_code);
}

function getNationalIdOptionLabel(service) {
  if (service.service_code === "NICR_ID_LOST") {
    return service.national_id_variant === "Damaged" ? "Damaged ID" : "Lost ID";
  }
  return service.service_code === "NICR_NAME_CHANGE"
    ? "Name or Surname Change"
    : service.service_name.replace(/^National ID\s*[—-]\s*/i, "");
}

function isRemovedNicrService(service) {
  if (REMOVED_NICR_SERVICE_CODES.has(service.service_code)) return true;
  const name = (service.service_name || "").toLowerCase().trim();
  return [
    "birth registration",
    "death registration",
    "late birth registration",
    "marriage registration",
    "civil record amendment",
    "verify a record",
    "verify record"
  ].includes(name);
}

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

const SERVICE_GROUPS_BY_MODULE = {
  IMMIGRATION: [
    { label: "Visas", matches: /visa|entry/i },
    { label: "Residence and work permits", matches: /residen|work|employment|study|permit/i },
    { label: "Citizenship and status", matches: /citizen|natural|nationality|status/i }
  ],
  LRMIS: [
    { label: "Animal registration", matches: /animal|livestock/i },
    { label: "Animal brands", matches: /brand|branding|mark/i },
    { label: "Movement and transport permits", matches: /movement|transport|import|export|permit/i }
  ]
};

function ServiceGroupIcon({ module, label }) {
  const name = label.toLowerCase();
  let iconType;
  if (module === "IMMIGRATION") {
    iconType = /visa|entry/.test(name)
      ? "visa"
      : /citizen|natural|nationality|status/.test(name)
        ? "citizenship"
        : "permit";
  } else {
    iconType = /brand|branding|mark/.test(name)
      ? "brand"
      : /movement|transport|import|export|permit/.test(name)
        ? "movement"
        : "animal";
  }

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconType === "visa" ? (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="11" r="4" />
          <path d="M8 11h8M12 7c1.2 1.2 1.2 6.8 0 8M8 17h8" />
        </>
      ) : iconType === "citizenship" ? (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M6 20v-2a6 6 0 0 1 12 0v2zM19 5l1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L17 7.3l2-.3z" />
        </>
      ) : iconType === "permit" ? (
        <>
          <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M15 3v5h4M8 13h7M8 17h5" />
          <path d="m15 16 1.5 1.5L20 14" />
        </>
      ) : iconType === "brand" ? (
        <>
          <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" />
          <path d="M8 9v6m0-3h4a2 2 0 1 0 0-4H8m8 7V9" />
        </>
      ) : iconType === "movement" ? (
        <>
          <path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z" />
          <circle cx="7.5" cy="19" r="1.5" />
          <circle cx="18" cy="19" r="1.5" />
          <path d="M6 11h5M8 9l-2 2 2 2" />
        </>
      ) : (
        <>
          <path d="M6 8 4 5m14 3 2-3M7 9c0-2.2 2.2-4 5-4s5 1.8 5 4v7a5 5 0 0 1-10 0z" />
          <path d="M9 12h.01M15 12h.01M10 17h4M12 5V3" />
        </>
      )}
    </svg>
  );
}

function CivilRegistrationServiceIcon({ serviceName }) {
  const iconPath = getServiceIcon(serviceName);
  const iconType = iconPath.includes("birth")
    ? "birth"
    : iconPath.includes("death")
      ? "death"
      : iconPath.includes("marriage")
        ? "marriage"
        : iconPath.includes("namec")
          ? "name"
          : iconPath.includes("lostID")
            ? "lostId"
            : iconPath.includes("renewalID")
              ? "renewal"
              : iconPath.includes("correctionID")
                ? "correction"
                : iconPath.includes("newID") || iconPath.includes("civil")
                  ? "identity"
                  : "verify";

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconType === "birth" ? (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M8 17a4 4 0 0 1 8 0M8 6h2M14 6h2" />
        </>
      ) : iconType === "death" ? (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M12 7v6m-3-3h6M8 17h8" />
        </>
      ) : iconType === "marriage" ? (
        <>
          <circle cx="9" cy="12" r="5" />
          <circle cx="15" cy="12" r="5" />
          <path d="M11 8.5 13 15.5" />
        </>
      ) : iconType === "name" || iconType === "correction" ? (
        <>
          <path d="M13 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <path d="M8 11h4M8 15h3m5.5-11.5 3 3L13 13l-3 1 1-3z" />
        </>
      ) : iconType === "lostId" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M6 16a3 3 0 0 1 6 0m3-5h3m-3 3h3" />
          <path d="M18 2v2m-1-1h2" />
        </>
      ) : iconType === "renewal" ? (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M6 16a3 3 0 0 1 6 0m2-5h3m-3 3h3M17 2l2 2-2 2" />
        </>
      ) : iconType === "verify" ? (
        <>
          <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M15 3v5h4m-11 5 2 2 4-4" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M6 16a3 3 0 0 1 6 0m3-5h3m-3 3h3" />
        </>
      )}
    </svg>
  );
}

// ============================================================
// TRANSLATIONS
// ============================================================
const TRANSLATIONS = {
  en: {
    home: "Home",
    language: "Language",
    searchPlaceholder: "Search for an article or service",
    articles: "ARTICLES",
    generalInfo: "General information",
    logout: "Logout",
    welcome: "Welcome",
    nationalId: "National ID",
    activeApplications: "Active applications",
    readyForCollection: "Ready for collection",
    notifications: "Notifications",
    availableServices: "Available services",
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
    dateOfBirth: "Date of birth",
    updateMissingProfileDetails: "Complete your profile",
    profileDetailsDesc: "Add your birth date and contact phone. An administrator must verify the birth date before it is used for age or eligibility checks.",
    saveProfile: "Save profile details",
    profileSaved: "Birth date submitted for administrator verification.",
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
    approvedDocumentsDesc: "Collect approved certificates and permits in person at a nearby collection centre.",
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
  },
  st: {
    home: "Lehae",
    language: "Puo",
    searchPlaceholder: "Batla sengoloa kapa tšebeletso",
    articles: "LINGOLOA",
    generalInfo: "Tlhahisoleseling e akaretsang",
    logout: "Tsoa",
    welcome: "Rea u amohela",
    nationalId: "Nomoro ea boitsebiso",
    activeApplications: "Likopo tse sebetsang",
    readyForCollection: "Li loketse ho nkoa",
    notifications: "Tsebiso",
    availableServices: "Litšebeletso tse fumanehang",
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
    dateOfBirth: "Letsatsi la tsoalo",
    updateMissingProfileDetails: "Tlatsa boitsebiso ba hau",
    profileDetailsDesc: "Kenya letsatsi la tsoalo le nomoro ea mohala. Motsamaisi o tlameha ho netefatsa letsatsi pele le sebelisoa ho lekola lilemo kapa tokelo.",
    saveProfile: "Boloka lintlha tsa boitsebiso",
    profileSaved: "Letsatsi la tsoalo le rometsoe hore le netefatsoe ke motsamaisi.",
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
    approvedDocumentsDesc: "Bokella litifikeiti le litumello tse amohetsoeng ka seqo setsing se haufi sa pokello.",
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
  const [selectedService, setSelectedService] = useState(null);
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

  const [activeDashboardTab, setActiveDashboardTab] = useState("NICR");
  const [openServiceGroup, setOpenServiceGroup] = useState(null);

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

  async function openService(serviceId, service = null) {
    setSubmitError("");
    setValues({});
    setFiles({});
    setOpenServiceGroup(null);
    if (service?.isNationalIdGroup) {
      setActiveService(service);
      setSelectedService(null);
      setFields([]);
      return;
    }
    try {
      const data = await api(`/services/${serviceId}`);
      setActiveService(data.service);
      setSelectedService(data.service);
      setFields(data.fields);
    } catch (err) { alert(err.message); }
  }

  async function selectServiceType(serviceId, nationalIdVariant = null) {
    setSubmitError("");
    setValues({});
    setFiles({});
    try {
      const data = await api(`/services/${serviceId}`);
      setSelectedService({ ...data.service, national_id_variant: nationalIdVariant });
      setValues(nationalIdVariant ? { incident_type: nationalIdVariant } : {});
      setFields(nationalIdVariant
        ? data.fields.filter(field => field.field_key !== "incident_type")
        : data.fields);
    } catch (err) { alert(err.message); }
  }

  function closeService() {
    setActiveService(null);
    setSelectedService(null);
    setFields([]);
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    const requiredUploads = [];
    const nationalIdUpload = NATIONAL_ID_UPLOADS[selectedService?.service_code];
    if (nationalIdUpload) requiredUploads.push(nationalIdUpload);
    if (selectedService?.service_code === "NICR_ID_LOST" &&
      selectedService.national_id_variant === "Damaged") {
      requiredUploads.push(DAMAGED_ID_UPLOAD);
    }
    if (selectedService?.service_code === "NICR_BIRTH_CERT" && values.certificate_condition === "Damaged") {
      requiredUploads.push(DAMAGED_BIRTH_CERTIFICATE_UPLOAD);
    }
    const missingUpload = requiredUploads.find(upload =>
      !files[upload.key] || !files[upload.key].type.startsWith("image/")
    );
    if (missingUpload) {
      setSubmitError(`Upload a valid image: ${missingUpload.label}.`);
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("serviceId", selectedService.service_id);
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
    () => {
      const moduleServices = services.filter(s =>
        s.module === activeModule && !isRemovedNicrService(s)
      );
      if (activeModule !== "NICR") return moduleServices;

      const nationalIdOptions = moduleServices.filter(isNationalIdService).flatMap(service =>
        service.service_code === "NICR_ID_LOST"
          ? [
            { ...service, national_id_variant: "Lost" },
            { ...service, national_id_variant: "Damaged" }
          ]
          : [service]
      );
      const otherServices = moduleServices.filter(s => !isNationalIdService(s));
      if (nationalIdOptions.length === 0) return otherServices;

      const firstIdService = nationalIdOptions.find(s => s.service_code === "NICR_ID_NEW") || nationalIdOptions[0];
      return [...otherServices, {
        ...firstIdService,
        service_name: "National ID",
        description: "Apply for or update your National ID.",
        isNationalIdGroup: true,
        nationalIdOptions
      }];
    },
    [services, activeModule]
  );

  const isMatchingSearch = (svc, query) => {
    if (!query || !query.trim()) return false;
    const q = query.toLowerCase();
    return (
      (svc.service_name || "").toLowerCase().includes(q) ||
      (svc.description || "").toLowerCase().includes(q) ||
      (svc.nationalIdOptions || []).some(option =>
        getNationalIdOptionLabel(option).toLowerCase().includes(q)
      )
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

  function handleDashboardTabChange(tab) {
    if (MODULES.some(module => module.key === tab)) {
      setActiveDashboardTab(tab);
      setActiveModule(tab);
      setOpenServiceGroup(null);
      setSettingsOpen(false);
      return;
    }
    setActiveDashboardTab(tab);
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
  const groupedModuleServices = useMemo(() => {
    const groups = SERVICE_GROUPS_BY_MODULE[activeModule];
    if (!groups) return [];

    const remainingServices = [...allModuleServices];
    const categorizedServices = groups.map(group => {
      const matchedServices = remainingServices.filter(service =>
        group.matches.test(`${service.service_code || ""} ${service.service_name || ""}`)
      );
      matchedServices.forEach(service => {
        remainingServices.splice(remainingServices.indexOf(service), 1);
      });
      return { label: group.label, services: matchedServices };
    }).filter(group => group.services.length > 0);

    if (remainingServices.length > 0) {
      categorizedServices.push({
        label: `Other ${activeModule === "IMMIGRATION" ? "immigration" : "livestock"} services`,
        services: remainingServices
      });
    }
    return categorizedServices;
  }, [activeModule, allModuleServices]);
  const groupedServicesModule = activeModule === "IMMIGRATION" || activeModule === "LRMIS";

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
                Home Affairs Services
              </h1>
            </div>

            <DashboardSearch onSearch={setSearchQuery} placeholder={t.searchPlaceholder} />
          </div>
          <div style={header.flagStripe}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>
        </header>

        <Navbar
          items={[
            ...MODULES.map(module => [module.key, module.label]),
            ["applications", t.settingsTabs.applications],
            ["notifications", `${t.settingsTabs.notifications}${unread ? ` (${unread})` : ""}`],
            ["profile", t.settingsTabs.profile]
          ]}
          activeTab={activeDashboardTab}
          onTabChange={handleDashboardTabChange}
          action={{ label: t.logout, onClick: handleLogout }}
          user={me}
        />

        <section style={section.wrapper}>
          <h2 style={section.title}>{t.availableServices}</h2>

          {anyDashboardMatch && (
            <p style={{
              margin: "0 0 12px", fontSize: 12,
              color: COLORS.blue, fontWeight: 600
            }}>
              {t.showingMatches} "{searchQuery}"
            </p>
          )}

          <div style={serviceListGrid}>
            {groupedServicesModule && groupedModuleServices.length > 0
              ? groupedModuleServices.map(group => (
                <div key={group.label} style={serviceDropdown}>
                  <button
                    type="button"
                    aria-expanded={openServiceGroup === group.label}
                    onClick={() => setOpenServiceGroup(current =>
                      current === group.label ? null : group.label
                    )}
                    style={serviceDropdownSummary}
                  >
                    <span style={serviceDropdownIconBox}>
                      <ServiceGroupIcon module={activeModule} label={group.label} />
                    </span>
                    <span style={{ flex: 1 }}>{group.label}</span>
                  </button>
                  {openServiceGroup === group.label && (
                    <div style={serviceDropdownOptions}>
                      {group.services.map(svc => (
                        <button
                          key={svc.service_id}
                          type="button"
                          onClick={() => {
                            setOpenServiceGroup(null);
                            openService(svc.service_id, svc);
                          }}
                          style={serviceDropdownOption}
                        >
                          <span>{svc.service_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
              : !groupedServicesModule && allModuleServices.map(svc => (
                <button
                  key={svc.service_id}
                  type="button"
                  onClick={() => openService(svc.service_id, svc)}
                  style={serviceButton}
                >
                  <span className="home-affairs-service-icon-box" style={serviceDropdownIconBox} aria-hidden="true">
                    <CivilRegistrationServiceIcon serviceName={svc.service_name} />
                  </span>
                  <span style={serviceButtonLabel}>{svc.service_name}</span>
                </button>
              ))}
            {allModuleServices.length === 0 && (
              <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
                {t.noServices}
              </p>
            )}
          </div>
        </section>

        <section style={{ ...section.wrapper, marginTop: 24 }}>
          <h2 style={section.title}>Recent applications</h2>
          <p style={section.subtitle}>Your latest Home Affairs applications.</p>
          {applications.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 13 }}>{t.noApplications}</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {applications.slice(0, 5).map(app => (
                <article key={app.application_id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 12, flexWrap: "wrap", background: "#fff",
                  border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14
                }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{app.reference_number}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>
                      {app.service_type} · {app.module} · Submitted {new Date(app.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge status={app.status} />
                    <button onClick={() => openDetail(app.application_id)} style={btnOutline}>
                      {t.viewDetails}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
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
            {activeService.isNationalIdGroup ? "National ID" : activeService.service_name}
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.textMuted }}>
            {activeService.description}
          </p>
          <form onSubmit={submit}>
            {activeService.isNationalIdGroup && (
              <Field
                field={{
                  field_key: "__national_id_service",
                  label: "National ID service",
                  field_type: "select",
                  options: activeService.nationalIdOptions.map(getNationalIdOptionLabel),
                  required: true
                }}
                value={selectedService ? getNationalIdOptionLabel(selectedService) : ""}
                onChange={value => {
                  const option = activeService.nationalIdOptions.find(
                    item => getNationalIdOptionLabel(item) === value
                  );
                  if (option) selectServiceType(option.service_id, option.national_id_variant);
                }}
                onFile={() => {}}
              />
            )}
            {activeService.service_code === "NICR_BIRTH_CERT" && (
              <Field
                field={{
                  field_key: "certificate_condition",
                  label: "Birth certificate request",
                  field_type: "select",
                  options: ["Standard copy", "Lost", "Damaged"],
                  required: true
                }}
                value={values.certificate_condition || ""}
                onChange={value => {
                  setValues(previous => {
                    const next = { ...previous, certificate_condition: value };
                    for (const extraField of Object.values(BIRTH_CERTIFICATE_EXTRA_FIELDS).flat()) {
                      delete next[extraField.field_key];
                    }
                    return next;
                  });
                  if (value === "Damaged") {
                    setFiles(previous => {
                      const next = { ...previous };
                      delete next.__extra;
                      return next;
                    });
                  }
                  if (value !== "Damaged") {
                    setFiles(previous => {
                      const next = { ...previous };
                      delete next[DAMAGED_BIRTH_CERTIFICATE_UPLOAD.key];
                      return next;
                    });
                  }
                }}
                onFile={() => {}}
              />
            )}
            {selectedService && NATIONAL_ID_UPLOADS[selectedService.service_code] && (
              <RequiredImageUpload
                key={selectedService.service_code}
                upload={NATIONAL_ID_UPLOADS[selectedService.service_code]}
                file={files[NATIONAL_ID_UPLOADS[selectedService.service_code].key]}
                onChange={file => setFiles(previous => ({
                  ...previous,
                  [NATIONAL_ID_UPLOADS[selectedService.service_code].key]: file
                }))}
              />
            )}
            {!(selectedService?.service_code === "NICR_ID_NEW" &&
              !files[NATIONAL_ID_UPLOADS.NICR_ID_NEW.key]) &&
              !(selectedService?.service_code === "NICR_ID_LOST" &&
                selectedService.national_id_variant === "Damaged" && !files[DAMAGED_ID_UPLOAD.key]) &&
              fields.map(f => (
              <Field
                key={f.field_key}
                field={f}
                value={values[f.field_key] || ""}
                onChange={v => {
                  setValues(previous => ({ ...previous, [f.field_key]: v }));
                  if (f.field_key === "incident_type" && v !== "Damaged") {
                    setFiles(previous => {
                      const next = { ...previous };
                      delete next[DAMAGED_ID_UPLOAD.key];
                      return next;
                    });
                  }
                }}
                onFile={file => setFiles(p => ({ ...p, [f.field_key]: file }))}
              />
            ))}
            {(BIRTH_CERTIFICATE_EXTRA_FIELDS[values.certificate_condition] || []).map(f => (
              <Field
                key={f.field_key}
                field={f}
                value={values[f.field_key] || ""}
                onChange={value => setValues(previous => ({ ...previous, [f.field_key]: value }))}
                onFile={file => setFiles(previous => ({ ...previous, [f.field_key]: file }))}
              />
            ))}
            {selectedService?.service_code === "NICR_ID_LOST" &&
              selectedService.national_id_variant === "Damaged" && (
              <RequiredImageUpload
                upload={DAMAGED_ID_UPLOAD}
                file={files[DAMAGED_ID_UPLOAD.key]}
                onChange={file => setFiles(previous => ({
                  ...previous,
                  [DAMAGED_ID_UPLOAD.key]: file
                }))}
              />
            )}
            {activeService.service_code === "NICR_BIRTH_CERT" && values.certificate_condition === "Damaged" && (
              <RequiredImageUpload
                upload={DAMAGED_BIRTH_CERTIFICATE_UPLOAD}
                file={files[DAMAGED_BIRTH_CERTIFICATE_UPLOAD.key]}
                onChange={file => setFiles(previous => ({
                  ...previous,
                  [DAMAGED_BIRTH_CERTIFICATE_UPLOAD.key]: file
                }))}
              />
            )}
            {!(selectedService?.service_code === "NICR_ID_LOST" &&
              selectedService.national_id_variant === "Damaged") &&
              !(activeService.service_code === "NICR_BIRTH_CERT" &&
                values.certificate_condition === "Damaged") && (
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <label style={{
                    display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6
                  }}>Additional documents</label>
                  <input type="file" multiple onChange={e => {
                    const arr = Array.from(e.target.files || []);
                    setFiles(p => ({ ...p, __extra: arr }));
                  }} />
                </div>
              )}
            {submitError && <p style={{ color: COLORS.error, fontSize: 13 }}>{submitError}</p>}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              gap: 10, marginTop: 16
            }}>
              <button type="button" onClick={closeService} style={btnOutline}>Cancel</button>
              <button type="submit" disabled={submitting || !selectedService} style={btnPrimary}>
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
                    <span>{d.original_filename}</span>
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

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <SettingsModal
          t={t}
          lang={lang}
          setLang={setLang}
          me={me}
          onProfileUpdated={setMe}
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
  t, lang, setLang, me, onProfileUpdated,
  applications, notifications, approvedApplications,
  docSearch, setDocSearch,
  settingsTab, setSettingsTab,
  onClose,
  photoInputRef, photoUploading, photoError, handlePhotoUpload,
  openDetail, viewCertificate, markRead
}) {
  const [profileForm, setProfileForm] = useState(() => ({
    date_of_birth: dateInputValue(me?.date_of_birth || me?.pending_date_of_birth),
    phone: me?.phone || ""
  }));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    setProfileForm({
      date_of_birth: dateInputValue(me?.date_of_birth || me?.pending_date_of_birth),
      phone: me?.phone || ""
    });
  }, [me]);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMessage("");
    setProfileSaving(true);
    try {
      const res = await api("/me/profile", {
        method: "POST",
        body: JSON.stringify(profileForm)
      });
      onProfileUpdated(res.user);
      setProfileForm({
        date_of_birth: dateInputValue(res.user?.date_of_birth),
        phone: res.user?.phone || ""
      });
      sessionStorage.setItem("user-profile", JSON.stringify(res.user));
      setProfileMessage(t.profileSaved);
    } catch (err) {
      setProfileMessage(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

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
      <div className="home-affairs-settings-panel" onClick={e => e.stopPropagation()} style={settingsPanel}>
        <div className="home-affairs-settings-header" style={settingsHeader}>
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

        <div className="home-affairs-settings-tabs" style={settingsTabsRow}>
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

        <div className="home-affairs-settings-body" style={settingsBody}>
          {settingsTab === "profile" && me && (
            <>
              <h3 style={settingsSectionTitle}>{t.myProfile}</h3>
              <p style={settingsSectionDesc}>{t.profileDesc}</p>

              <div className="profile-settings-grid" style={{
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
                  <div className="profile-settings-card" style={settingsCard}>
                    <h4 style={settingsCardTitle}>{t.profileDetails}</h4>
                    <ProfileRow label={t.fullName} value={me.full_name} />
                    <ProfileRow label={t.email} value={me.email || "—"} />
                    <ProfileRow label={t.phone} value={me.phone || "—"} />
                    <ProfileRow label={t.nationalId} value={me.national_id_number || me.national_id || "—"} />
                    <ProfileRow label={t.dateOfBirth} value={me.date_of_birth ? dateInputValue(me.date_of_birth) : "Not verified"} />
                    {me.pending_date_of_birth && <ProfileRow label="Birth date awaiting verification" value={dateInputValue(me.pending_date_of_birth)} />}
                    <ProfileRow label={t.accountType} value={me.account_type} />
                    <ProfileRow label={t.accountStatus} value={me.account_status} />
                    <ProfileRow label={t.memberSince} value={new Date(me.created_at).toLocaleDateString()} />
                  </div>

                  <form onSubmit={saveProfile} className="profile-settings-card" style={{ ...settingsCard, display: "grid", gap: 12 }}>
                    <h4 style={settingsCardTitle}>{t.updateMissingProfileDetails}</h4>
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{t.profileDetailsDesc}</p>
                    <label style={{ display: "grid", gap: 6, color: COLORS.textMid, fontSize: 13, fontWeight: 700 }}>
                      {t.dateOfBirth}
                      <input type="date" required value={profileForm.date_of_birth}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={e => setProfileForm(previous => ({ ...previous, date_of_birth: e.target.value }))}
                        style={{ ...settingsInput, minHeight: 44, fontSize: 15 }} />
                    </label>
                    <label style={{ display: "grid", gap: 6, color: COLORS.textMid, fontSize: 13, fontWeight: 700 }}>
                      {t.phone}
                      <input type="tel" inputMode="tel" autoComplete="tel"
                        value={profileForm.phone}
                        onChange={e => setProfileForm(previous => ({ ...previous, phone: e.target.value }))}
                        placeholder={t.phone}
                        style={{ ...settingsInput, minHeight: 44, fontSize: 15 }} />
                    </label>
                    {profileMessage && <p role="status" style={{ margin: 0, color: profileMessage === t.profileSaved ? COLORS.success : COLORS.error, fontSize: 13 }}>{profileMessage}</p>}
                    <button type="submit" disabled={profileSaving} style={btnPrimary}>
                      {profileSaving ? "Saving..." : t.saveProfile}
                    </button>
                  </form>

                  <div className="profile-settings-card" style={settingsCard}>
                    <h4 style={settingsCardTitle}>{t.identityPhoto}</h4>
                    <p style={{
                      margin: "0 0 14px", fontSize: 12,
                      color: COLORS.textMuted, lineHeight: 1.5
                    }}>{t.identityPhotoDesc}</p>

                    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                      <div className="profile-settings-photo-placeholder" style={{
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
                    <CollectionCentreReferral department="Home Affairs" />
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

const serviceListGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  columnGap: 20,
  rowGap: 4
};

const serviceButton = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  minWidth: 0,
  minHeight: 54,
  padding: "7px 8px",
  border: 0,
  borderRadius: 6,
  background: "transparent",
  color: COLORS.textDark,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  transition: "none"
};

const serviceButtonLabel = {
  display: "block",
  minWidth: 0,
  fontSize: 13,
  fontWeight: 700,
  color: "#1B3A8C",
  lineHeight: 1.35
};

const serviceDropdown = {
  alignSelf: "start"
};

const serviceDropdownSummary = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 10,
  width: "100%",
  minHeight: 48,
  padding: "5px 4px",
  border: 0,
  background: "transparent",
  color: COLORS.textDark,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left"
};

const serviceDropdownOptions = {
  display: "grid",
  padding: "0 8px 8px 48px"
};

const serviceDropdownOption = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  minHeight: 42,
  padding: "8px 4px",
  border: 0,
  background: "transparent",
  color: COLORS.textDark,
  fontFamily: "inherit",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer"
};

const serviceDropdownIconBox = {
  display: "grid",
  placeItems: "center",
  width: 36,
  height: 36,
  flexShrink: 0,
  border: "1px solid #d1e9ff",
  borderRadius: 8,
  background: "#eff8ff",
  color: COLORS.blue
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

function RequiredImageUpload({ upload, file, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 600,
        marginBottom: 6, color: COLORS.textMid
      }}>
        {upload.label} *
      </label>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textMuted }}>
        {upload.instructions}
      </p>
      <input
        type="file"
        accept="image/*"
        required
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
      {file && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: COLORS.textMuted }}>
          Selected: {file.name}
        </p>
      )}
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
    <span className="dashboard-status-badge" style={{
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

function NationalIDCard({ application, fields, onClose }) {
  return (
    <div>
      <div style={{
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
      </div>
      <CollectionCentreReferral department="Home Affairs" />
    </div>
  );
}

function CivilCertificate({ application, fields, onClose }) {
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
      <div style={{
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
      </div>
      <CollectionCentreReferral department="Home Affairs" />
    </div>
  );
}

function ImmigrationPermit({ application, fields, onClose }) {
  return (
    <div>
      <div style={{
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
      </div>
      <CollectionCentreReferral department="Immigration" />
    </div>
  );
}

function LivestockCertificate({ application, fields, onClose }) {
  return (
    <div>
      <div style={{
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
      </div>
      <CollectionCentreReferral department="Home Affairs" />
    </div>
  );
}

function GenericCertificate({ application, fields, onClose }) {
  return (
    <div>
      <div>
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
      </div>
      <CollectionCentreReferral department="Home Affairs" />
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

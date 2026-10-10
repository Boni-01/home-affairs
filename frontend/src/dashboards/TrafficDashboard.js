import React, { useEffect, useState, useCallback, useRef } from "react";
import { COLORS, layout, header, section } from "../styles/dashboardStyles";
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

// ============================================================
// SERVICE CONFIG — drives the modal form
// ============================================================
const SERVICE_CONFIG = {
  LEARNER_LICENCE: {
    label: "Learner's Licence Application",
    fee: 50,
    icon: "📝",
    fields: [
      { key: "id_number", label: "National ID Number", type: "text", required: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      { key: "licence_category", label: "Licence Category", type: "select", options: ["A - Motorcycle", "B - Light Motor Vehicle", "C - Heavy Motor Vehicle", "EB - Learner Light", "EC - Learner Heavy"], required: true },
      { key: "test_center", label: "Preferred Test Centre", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng", "Mohale's Hoek", "Quthing", "Qacha's Nek", "Mokhotlong", "Thaba-Tseka", "Butha-Buthe"], required: true },
      { key: "medical_conditions", label: "Any medical conditions? (optional)", type: "textarea" }
    ]
  },
  DRIVER_LICENCE: {
    label: "Driver's Licence Application",
    fee: 100,
    icon: "🚗",
    fields: [
      { key: "id_number", label: "National ID Number", type: "text", required: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      { key: "licence_category", label: "Licence Category", type: "select", options: ["A - Motorcycle", "B - Light Motor Vehicle", "C - Heavy Motor Vehicle", "D - Public Service Vehicle"], required: true },
      { key: "has_existing_licence", label: "Do you already have a licence?", type: "select", options: ["No", "Yes"], required: true },
      { key: "existing_licence_number", label: "Existing Licence Number (if any)", type: "text" },
      { key: "test_center", label: "Preferred Test Centre", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng", "Mohale's Hoek", "Quthing", "Qacha's Nek", "Mokhotlong", "Thaba-Tseka", "Butha-Buthe"], required: true }
    ]
  },
  LICENCE_RENEWAL: {
    label: "Driver's Licence Renewal",
    fee: 80,
    icon: "🔄",
    fields: [
      { key: "licence_number", label: "Current Licence Number", type: "text", required: true },
      { key: "licence_category", label: "Licence Category", type: "text", required: true },
      { key: "expiry_date", label: "Current Expiry Date", type: "date", required: true },
      { key: "collection_office", label: "Collection Office", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng", "Mohale's Hoek", "Quthing"], required: true }
    ]
  },
  LICENCE_REPLACEMENT: {
    label: "Licence Replacement (Lost / Damaged)",
    fee: 100,
    icon: "📋",
    fields: [
      { key: "licence_number", label: "Licence Number (if known)", type: "text" },
      { key: "reason", label: "Reason", type: "select", options: ["Lost", "Damaged", "Stolen"], required: true },
      { key: "police_case_number", label: "Police Case Number (if stolen)", type: "text" },
      { key: "circumstances", label: "Explain the circumstances", type: "textarea", required: true }
    ]
  },
  LICENCE_CORRECTION: {
    label: "Licence Correction",
    fee: 50,
    icon: "✏️",
    fields: [
      { key: "licence_number", label: "Licence Number", type: "text", required: true },
      { key: "field_to_correct", label: "Field to Correct", type: "select", options: ["Name spelling", "Date of birth", "National ID", "Address", "Category", "Other"], required: true },
      { key: "current_value", label: "Current (Wrong) Value", type: "text", required: true },
      { key: "correct_value", label: "Correct Value", type: "text", required: true },
      { key: "supporting_details", label: "Supporting Details", type: "textarea" }
    ]
  },
  VEHICLE_REGISTRATION: {
    label: "Register a Motor Vehicle",
    fee: 150,
    icon: "🚙",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "engine_number", label: "Engine Number", type: "text" },
      { key: "make", label: "Make", type: "text", required: true },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "year", label: "Year of Manufacture", type: "number", required: true },
      { key: "vehicle_type", label: "Vehicle Type", type: "select", options: ["Sedan", "SUV", "Pickup", "Truck", "Bus", "Motorcycle", "Trailer", "Other"], required: true },
      { key: "colour", label: "Colour", type: "text" },
      { key: "country_of_origin", label: "Country of Origin", type: "text" }
    ]
  },
  IMPORTED_VEHICLE_REGISTRATION: {
    label: "Register an Imported Vehicle",
    fee: 250,
    icon: "📦",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "make", label: "Make", type: "text", required: true },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "year", label: "Year of Manufacture", type: "number", required: true },
      { key: "vehicle_type", label: "Vehicle Type", type: "select", options: ["Sedan", "SUV", "Pickup", "Truck", "Bus", "Motorcycle", "Other"], required: true },
      { key: "country_of_origin", label: "Country of Import", type: "text", required: true },
      { key: "customs_reference", label: "Customs Clearance Reference", type: "text", required: true },
      { key: "bill_of_lading", label: "Bill of Lading / Shipping Reference", type: "text" },
      { key: "port_of_entry", label: "Port of Entry", type: "text" }
    ]
  },
  SECOND_HAND_LOCAL: {
    label: "Second-Hand Vehicle (Purchased Locally)",
    fee: 150,
    icon: "🚗",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "make", label: "Make", type: "text", required: true },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "year", label: "Year", type: "number" },
      { key: "seller_name", label: "Seller's Full Name", type: "text", required: true },
      { key: "seller_national_id", label: "Seller's National ID", type: "text", required: true },
      { key: "purchase_price", label: "Purchase Price (M)", type: "number" },
      { key: "purchase_date", label: "Purchase Date", type: "date" }
    ]
  },
  SECOND_HAND_FOREIGN: {
    label: "Second-Hand Vehicle (Purchased Abroad)",
    fee: 250,
    icon: "🌍",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "make", label: "Make", type: "text", required: true },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "year", label: "Year", type: "number" },
      { key: "country_purchased", label: "Country Purchased", type: "text", required: true },
      { key: "customs_reference", label: "Customs Clearance Reference", type: "text", required: true },
      { key: "foreign_registration", label: "Foreign Registration Number", type: "text" }
    ]
  },
  OWNERSHIP_TRANSFER: {
    label: "Vehicle Ownership Transfer",
    fee: 100,
    icon: "📝",
    fields: [
      { key: "registration_number", label: "Current Registration Number", type: "text", required: true },
      { key: "new_owner_name", label: "New Owner's Full Name", type: "text", required: true },
      { key: "new_owner_id", label: "New Owner's National ID", type: "text", required: true },
      { key: "transfer_reason", label: "Reason for Transfer", type: "select", options: ["Sale", "Inheritance", "Gift", "Court order", "Other"], required: true },
      { key: "transfer_date", label: "Transfer Date", type: "date", required: true }
    ]
  },
  NUMBER_PLATE: {
    label: "Apply for Number Plates",
    fee: 100,
    icon: "🔢",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "registration_number", label: "Registration Number (if assigned)", type: "text" },
      { key: "plate_type", label: "Plate Type", type: "select", options: ["Standard", "Personalised", "Commercial", "Government"], required: true },
      { key: "preferred_text", label: "Preferred Plate Text (personalised only)", type: "text" },
      { key: "collection_office", label: "Collection Office", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng"], required: true }
    ]
  },
  NUMBER_PLATE_REPLACEMENT: {
    label: "Replace Number Plates",
    fee: 150,
    icon: "🔢",
    fields: [
      { key: "registration_number", label: "Current Registration Number", type: "text", required: true },
      { key: "reason", label: "Reason", type: "select", options: ["Lost", "Damaged", "Stolen", "Worn out"], required: true },
      { key: "police_case_number", label: "Police Case Number (if stolen)", type: "text" },
      { key: "circumstances", label: "Explain the circumstances", type: "textarea", required: true }
    ]
  },
  SPECIAL_VEHICLE_PERMIT: {
    label: "Special Permit (New Vehicle Awaiting Registration)",
    fee: 100,
    icon: "📄",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "make", label: "Make", type: "text", required: true },
      { key: "model", label: "Model", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "reason", label: "Reason for Special Permit", type: "textarea", required: true },
      { key: "valid_from", label: "Valid From", type: "date", required: true },
      { key: "valid_to", label: "Valid To", type: "date", required: true }
    ]
  },
  ROADWORTHINESS_INSPECTION: {
    label: "Roadworthiness Inspection",
    fee: 80,
    icon: "🔧",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "registration_number", label: "Registration Number", type: "text" },
      { key: "vehicle_type", label: "Vehicle Type", type: "text", required: true },
      { key: "inspection_location", label: "Preferred Inspection Location", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng", "Mohale's Hoek", "Quthing", "Qacha's Nek"], required: true },
      { key: "preferred_date", label: "Preferred Date", type: "date", required: true },
      { key: "preferred_time", label: "Preferred Time", type: "select", options: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"] }
    ]
  },
  FITNESS_INSPECTION: {
    label: "Fitness Inspection",
    fee: 80,
    icon: "✅",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "registration_number", label: "Registration Number", type: "text" },
      { key: "inspection_location", label: "Preferred Inspection Location", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng"], required: true },
      { key: "preferred_date", label: "Preferred Date", type: "date", required: true },
      { key: "preferred_time", label: "Preferred Time", type: "select", options: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"] },
      { key: "notes", label: "Additional Notes", type: "textarea" }
    ]
  },
  RE_INSPECTION: {
    label: "Re-inspection",
    fee: 40,
    icon: "🔁",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "previous_inspection_reference", label: "Previous Inspection Reference", type: "text", required: true },
      { key: "defects_fixed", label: "Describe defects fixed", type: "textarea", required: true },
      { key: "inspection_location", label: "Inspection Location", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng"], required: true },
      { key: "preferred_date", label: "Preferred Date", type: "date", required: true }
    ]
  },
  PUBLIC_MOTOR_VEHICLE_PERMIT: {
    label: "Public Motor Vehicle Permit",
    fee: 300,
    icon: "🚌",
    fields: [
      { key: "vin", label: "VIN / Chassis Number", type: "text", required: true },
      { key: "registration_number", label: "Registration Number", type: "text", required: true },
      { key: "permit_type", label: "Permit Type", type: "select", options: ["Taxi", "Bus", "Minibus", "School Transport", "Tourism", "Goods Transport"], required: true },
      { key: "route", label: "Route / Operating Area", type: "text", required: true },
      { key: "seating_capacity", label: "Seating Capacity", type: "number", required: true },
      { key: "operator_name", label: "Operator Name", type: "text", required: true },
      { key: "operator_licence", label: "Operator Licence Number", type: "text" }
    ]
  },
  PERMIT_RENEWAL: {
    label: "Permit Renewal",
    fee: 250,
    icon: "🔄",
    fields: [
      { key: "permit_number", label: "Existing Permit Number", type: "text", required: true },
      { key: "registration_number", label: "Vehicle Registration Number", type: "text", required: true },
      { key: "renewal_period", label: "Renewal Period", type: "select", options: ["6 months", "1 year", "2 years"], required: true },
      { key: "notes", label: "Additional Notes", type: "textarea" }
    ]
  },
  DRIVING_SCHOOL_REGISTRATION: {
    label: "Driving School Registration",
    fee: 500,
    icon: "🎓",
    fields: [
      { key: "school_name", label: "School Name", type: "text", required: true },
      { key: "owner_name", label: "Owner / Director Name", type: "text", required: true },
      { key: "owner_id", label: "Owner National ID", type: "text", required: true },
      { key: "physical_address", label: "Physical Address", type: "textarea", required: true },
      { key: "district", label: "District", type: "select", options: ["Maseru", "Leribe", "Berea", "Mafeteng", "Mohale's Hoek", "Quthing", "Qacha's Nek", "Mokhotlong", "Thaba-Tseka", "Butha-Buthe"], required: true },
      { key: "contact_phone", label: "Contact Phone", type: "text", required: true },
      { key: "contact_email", label: "Contact Email", type: "email" },
      { key: "num_instructors", label: "Number of Instructors", type: "number" },
      { key: "num_vehicles", label: "Number of Training Vehicles", type: "number" }
    ]
  },
  INSTRUCTOR_REGISTRATION: {
    label: "Driving Instructor Registration",
    fee: 200,
    icon: "👨‍🏫",
    fields: [
      { key: "full_name", label: "Instructor Full Name", type: "text", required: true },
      { key: "national_id", label: "National ID", type: "text", required: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date" },
      { key: "licence_number", label: "Driver's Licence Number", type: "text", required: true },
      { key: "licence_category", label: "Licence Category", type: "text", required: true },
      { key: "years_experience", label: "Years of Driving Experience", type: "number", required: true },
      { key: "school_name", label: "Affiliated School (if any)", type: "text" },
      { key: "qualifications", label: "Qualifications / Certificates", type: "textarea" }
    ]
  },
  RECORD_CORRECTION: {
    label: "Record Correction",
    fee: 50,
    icon: "✏️",
    fields: [
      { key: "record_type", label: "Type of Record", type: "select", options: ["Driver licence", "Vehicle registration", "Fine", "Permit", "Other"], required: true },
      { key: "record_reference", label: "Record Reference", type: "text", required: true },
      { key: "incorrect_field", label: "What is incorrect?", type: "text", required: true },
      { key: "correct_value", label: "Correct Value", type: "text", required: true },
      { key: "supporting_details", label: "Supporting Details", type: "textarea" }
    ]
  }
};

// ============================================================
// COMPONENT
// ============================================================
function TrafficDashboard() {
  const [tab, setTab] = useState("overview");
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [applications, setApplications] = useState([]);
  const [licences, setLicences] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [fines, setFines] = useState([]);
  const [clearances, setClearances] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState("");

  // Modal state
  const [showNewApplication, setShowNewApplication] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [formFields, setFormFields] = useState({});
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUrgency, setFormUrgency] = useState("NORMAL");
  const [extraDocs, setExtraDocs] = useState([]);

  // Detail modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [detail, setDetail] = useState(null);

  // Licence view
  const [licenceView, setLicenceView] = useState(null);

  // Complaint modal
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ type: "DELAY", subject: "", description: "" });

  // Pay fine modal
  const [payFineModal, setPayFineModal] = useState(null);
  const [payMethod, setPayMethod] = useState("MOBILE_MONEY");
  const [payRef, setPayRef] = useState("");

  // Track modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackRef, setTrackRef] = useState("");
  const [trackResult, setTrackResult] = useState(null);

  // Photo upload
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);

  const today = new Date().toLocaleDateString("en-LS", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meRes, appsRes, licencesRes, vehiclesRes, finesRes, clearancesRes, notificationsRes, complaintsRes, paymentsRes, schoolsRes] = await Promise.all([
        api("/me").catch(() => ({ user: null })),
        api("/traffic/applications/my").catch(() => ({ applications: [] })),
        api("/traffic/licences/my").catch(() => ({ licences: [] })),
        api("/traffic/vehicles/my").catch(() => ({ vehicles: [] })),
        api("/traffic/fines/my").catch(() => ({ fines: [] })),
        api("/traffic/clearances/my").catch(() => ({ clearances: [] })),
        api("/traffic/notifications").catch(() => ({ notifications: [] })),
        api("/traffic/complaints/my").catch(() => ({ complaints: [] })),
        api("/traffic/payments/my").catch(() => ({ payments: [] })),
        api("/traffic/driving-schools").catch(() => ({ schools: [] }))
      ]);

      setMe(meRes.user);
      setApplications(appsRes.applications || []);
      setLicences(licencesRes.licences || []);
      setVehicles(vehiclesRes.vehicles || []);
      setFines(finesRes.fines || []);
      setClearances(clearancesRes.clearances || []);
      setNotifications(notificationsRes.notifications || []);
      setComplaints(complaintsRes.complaints || []);
      setPayments(paymentsRes.payments || []);
      setSchools(schoolsRes.schools || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Open service modal
  const openServiceModal = (serviceType) => {
    setSelectedServiceType(serviceType);
    setFormFields({});
    setFormTitle(SERVICE_CONFIG[serviceType]?.label || "");
    setFormDescription("");
    setFormUrgency("NORMAL");
    setExtraDocs([]);
    setShowNewApplication(true);
    setError("");
    setSuccess("");
  };

  // Submit application
  const submitApplication = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!selectedServiceType) {
      setError("Please select a service type.");
      return;
    }

    const config = SERVICE_CONFIG[selectedServiceType];
    if (config) {
      for (const field of config.fields) {
        if (field.required && !formFields[field.key]) {
          setError(`Missing required field: ${field.label}`);
          return;
        }
      }
    }

    try {
      const fd = new FormData();
      fd.append("applicationType", selectedServiceType);
      fd.append("title", formTitle);
      fd.append("description", formDescription);
      fd.append("fields", JSON.stringify({ ...formFields, urgency: formUrgency }));
      
      for (const f of extraDocs) {
        if (f instanceof File) fd.append("documents", f, f.name);
      }

      const res = await api("/traffic/applications", { method: "POST", body: fd });

      setSuccess(`Application submitted! Reference: ${res.referenceNumber}`);
      setShowNewApplication(false);
      setSelectedServiceType("");
      setFormFields({});
      setFormTitle("");
      setFormDescription("");
      setFormUrgency("NORMAL");
      setExtraDocs([]);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete application
  const deleteApplication = async (id, ref) => {
    if (!window.confirm(`Delete application ${ref}? This cannot be undone.`)) return;
    try {
      await api(`/traffic/applications/${id}`, { method: "DELETE" });
      setSuccess(`Application ${ref} deleted.`);
      load();
    } catch (err) { setError(err.message); }
  };

  // Open application detail
  const openDetail = async (id) => {
    try {
      const data = await api(`/traffic/applications/${id}`);
      setSelectedApp(data.application);
      setDetail(data);
    } catch (err) { alert(err.message); }
  };

  // View licence
  const viewLicence = (licence) => {
    setLicenceView(licence);
  };

  // Search schools
  const searchSchools = async () => {
    try {
      const res = await api(`/traffic/driving-schools?search=${encodeURIComponent(schoolSearch)}`);
      setSchools(res.schools || []);
    } catch (err) { setError(err.message); }
  };

  // Submit complaint
  const submitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.subject || !complaintForm.description) {
      setError("Subject and description are required.");
      return;
    }
    try {
      const res = await api("/traffic/complaints", {
        method: "POST",
        body: JSON.stringify({
          complaint_type: complaintForm.type,
          subject: complaintForm.subject,
          description: complaintForm.description
        })
      });
      setSuccess(`Complaint submitted. Reference: ${res.reference}`);
      setShowComplaintModal(false);
      setComplaintForm({ type: "DELAY", subject: "", description: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  // Pay fine
  const submitFinePayment = async (e) => {
    e.preventDefault();
    if (!payFineModal) return;
    try {
      await api(`/traffic/fines/${payFineModal.fine_id}/pay`, {
        method: "POST",
        body: JSON.stringify({
          payment_method: payMethod,
          transaction_reference: payRef || undefined
        })
      });
      setSuccess(`Payment recorded for fine ${payFineModal.fine_reference}.`);
      setPayFineModal(null);
      setPayMethod("MOBILE_MONEY");
      setPayRef("");
      load();
    } catch (err) { setError(err.message); }
  };

  // Track by reference
  const trackApplication = async (e) => {
    e.preventDefault();
    if (!trackRef.trim()) return;
    setTrackResult(null);
    try {
      const res = await api(`/traffic/track/${encodeURIComponent(trackRef.trim())}`);
      setTrackResult(res);
    } catch (err) { setError(err.message); }
  };

  // Mark notification read
  const markRead = async (id) => {
    try {
      await api(`/traffic/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n => 
        n.notification_id === id ? { ...n, read_at: new Date().toISOString() } : n
      ));
    } catch (err) { console.error(err); }
  };

  // Photo upload
  const handlePhotoUpload = async (e) => {
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
  };

  // Computed values
  const unread = notifications.filter(n => !n.read_at).length;
  const pendingApps = applications.filter(a =>
    ["SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_REQUIRED", "APPOINTMENT_REQUIRED", "PAYMENT_PENDING"].includes(a.status)
  ).length;
  const unpaidFines = fines.filter(f => f.fine_status === "UNPAID");
  const totalDue = unpaidFines.reduce((s, f) => s + Number(f.amount || 0), 0);
  const validLicences = licences.filter(l => l.licence_status === "VALID");

  if (loading && !me) {
    return (
      <main style={layout.page}>
        <div style={layout.container}>
          <div style={{ textAlign: "center", padding: 60, color: COLORS.textMuted }}>
            Loading traffic services…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={layout.page}>
      <div style={layout.container}>
        {/* HEADER */}
        <header style={header.wrapper}>
          <div style={header.content}>
            <p style={header.eyebrow}>Department of Traffic & Transport · Lesotho</p>
            <h1 style={header.title}>Traffic Services Dashboard</h1>
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

        {error && (
          <div style={{
            padding: "14px 18px", borderRadius: 8, marginBottom: 16,
            fontSize: 13, fontWeight: 600, background: "#fdecea",
            color: "#b3261e", border: "1px solid #fecdca"
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            padding: "14px 18px", borderRadius: 8, marginBottom: 16,
            fontSize: 13, fontWeight: 600, background: "#ecfdf3",
            color: "#067647", border: "1px solid #a6f4c5"
          }}>{success}</div>
        )}

        {/* METRICS */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16, marginBottom: 28
        }}>
          <StatCard label="Applications" value={applications.length} accent={COLORS.blue} />
          <StatCard label="Pending" value={pendingApps} accent={COLORS.amber} />
          <StatCard label="Valid Licences" value={validLicences.length} accent={COLORS.green} />
          <StatCard label="Vehicles" value={vehicles.length} accent={COLORS.teal} />
          <StatCard label="Unpaid Fines" value={unpaidFines.length} accent={COLORS.red} />
          <StatCard label="Amount Due" value={`M ${totalDue.toLocaleString()}`} accent={COLORS.red} />
        </section>

        {/* TABS */}
        <nav style={{
          display: "flex", gap: 4, marginBottom: 24,
          borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap"
        }}>
          {[
            ["overview", "Overview"],
            ["apply", "Apply"],
            ["applications", `Applications (${applications.length})`],
            ["licences", `Licences (${licences.length})`],
            ["vehicles", `Vehicles (${vehicles.length})`],
            ["fines", `Fines (${fines.length})`],
            ["payments", `Payments (${payments.length})`],
            ["complaints", `Complaints (${complaints.length})`],
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

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <>
            <section style={section.wrapper}>
              <h2 style={section.title}>Quick Actions</h2>
              <p style={section.subtitle}>Start a service instantly.</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12
              }}>
                <ShortcutButton icon="📝" label="Apply for Learner's Licence" onClick={() => openServiceModal("LEARNER_LICENCE")} />
                <ShortcutButton icon="🚗" label="Apply for Driver's Licence" onClick={() => openServiceModal("DRIVER_LICENCE")} />
                <ShortcutButton icon="🔄" label="Renew Licence" onClick={() => openServiceModal("LICENCE_RENEWAL")} />
                <ShortcutButton icon="📋" label="Replace Lost Licence" onClick={() => openServiceModal("LICENCE_REPLACEMENT")} />
                <ShortcutButton icon="🚙" label="Register a Vehicle" onClick={() => openServiceModal("VEHICLE_REGISTRATION")} />
                <ShortcutButton icon="🔧" label="Book Roadworthiness" onClick={() => openServiceModal("ROADWORTHINESS_INSPECTION")} />
                <ShortcutButton icon="🚌" label="Public Transport Permit" onClick={() => openServiceModal("PUBLIC_MOTOR_VEHICLE_PERMIT")} />
                <ShortcutButton icon="💬" label="Submit a Complaint" onClick={() => setShowComplaintModal(true)} />
              </div>
            </section>

            <section style={section.wrapper}>
              <h2 style={section.title}>Recent Applications</h2>
              <p style={section.subtitle}>Your most recent traffic service applications.</p>
              {applications.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                  No applications yet. Use "Quick Actions" above to get started.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Reference", "Service", "Submitted", "Status"].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {applications.slice(0, 5).map(app => (
                        <tr key={app.application_id}>
                          <td style={tdStyle}><strong>{app.reference_number}</strong></td>
                          <td style={tdStyle}>{app.title}</td>
                          <td style={tdStyle}>{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("en-LS") : "—"}</td>
                          <td style={tdStyle}><StatusBadge status={app.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {unpaidFines.length > 0 && (
              <section style={section.wrapper}>
                <h2 style={section.title}>Unpaid Fines</h2>
                <p style={section.subtitle}>Pay fines directly from this dashboard.</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Reference", "Offence", "Date", "Amount", "Action"].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidFines.map(fine => (
                        <tr key={fine.fine_id}>
                          <td style={tdStyle}><strong>{fine.fine_reference}</strong></td>
                          <td style={tdStyle}>{fine.offence_description}</td>
                          <td style={tdStyle}>{fine.offence_date ? new Date(fine.offence_date).toLocaleDateString("en-LS") : "—"}</td>
                          <td style={tdStyle}>M {Number(fine.amount).toLocaleString()}</td>
                          <td style={tdStyle}>
                            <button onClick={() => setPayFineModal(fine)} style={btnSmall}>Pay Now</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {/* APPLY TAB */}
        {tab === "apply" && (
          <section style={section.wrapper}>
            <h2 style={section.title}>Available Services</h2>
            <p style={section.subtitle}>Select a service to start an application.</p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18
            }}>
              {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => (
                <article key={key} style={{
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{cfg.icon}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      padding: "4px 10px", borderRadius: 6,
                      background: "#eff8ff", color: COLORS.blue
                    }}>M {cfg.fee}</span>
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 15, color: COLORS.blue, fontWeight: 700 }}>
                    {cfg.label}
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: COLORS.textMuted, flexGrow: 1 }}>
                    {cfg.fields.length} fields required
                  </p>
                  <button onClick={() => openServiceModal(key)} style={{
                    width: "100%", padding: "11px", border: 0,
                    background: COLORS.blue, color: "#fff",
                    borderRadius: 6, fontWeight: 700, fontSize: 13,
                    cursor: "pointer", fontFamily: "inherit"
                  }}>Start Application</button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* APPLICATIONS TAB */}
        {tab === "applications" && (
          <section style={section.wrapper}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={section.title}>My Applications</h2>
                <p style={section.subtitle}>All your traffic service applications.</p>
              </div>
              <button onClick={() => setTab("apply")} style={btnPrimary}>+ New Application</button>
            </div>

            {applications.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No applications yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Reference", "Service", "Type", "Submitted", "Status", "Actions"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => (
                      <tr key={app.application_id}>
                        <td style={tdStyle}><strong>{app.reference_number}</strong></td>
                        <td style={tdStyle}>{app.title}</td>
                        <td style={tdStyle}>{app.application_type?.replace(/_/g, " ")}</td>
                        <td style={tdStyle}>{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("en-LS") : "—"}</td>
                        <td style={tdStyle}><StatusBadge status={app.status} /></td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => openDetail(app.application_id)} style={btnOutline}>
                              View
                            </button>
                            {["DRAFT", "SUBMITTED", "DOCUMENTS_REQUIRED"].includes(app.status) && (
                              <button onClick={() => deleteApplication(app.application_id, app.reference_number)} style={btnDanger}>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* LICENCES TAB */}
        {tab === "licences" && (
          <section style={section.wrapper}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={section.title}>My Driver's Licences</h2>
                <p style={section.subtitle}>View, download and manage your licences.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => openServiceModal("LICENCE_RENEWAL")} style={btnOutline}>Renew</button>
                <button onClick={() => openServiceModal("LICENCE_REPLACEMENT")} style={btnOutline}>Replace</button>
                <button onClick={() => openServiceModal("DRIVER_LICENCE")} style={btnPrimary}>Apply New</button>
              </div>
            </div>

            {licences.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No licences on record. Click "Apply New" to apply.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20
              }}>
                {licences.map(lic => (
                  <article key={lic.licence_id} style={{
                    background: "#fff",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 20,
                    boxShadow: "0 2px 8px rgba(0,32,159,0.05)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: COLORS.textMuted,
                          textTransform: "uppercase", letterSpacing: 0.5
                        }}>Licence Number</span>
                        <p style={{
                          margin: "4px 0 0", fontSize: 16, fontWeight: 700,
                          color: COLORS.blue, fontFamily: "Consolas, monospace"
                        }}>{lic.licence_number}</p>
                      </div>
                      <StatusBadge status={lic.licence_status} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                        <span style={{ color: COLORS.textMuted }}>Category</span>
                        <span style={{ fontWeight: 600 }}>{lic.licence_category}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                        <span style={{ color: COLORS.textMuted }}>Issue Date</span>
                        <span style={{ fontWeight: 600 }}>{lic.issue_date ? new Date(lic.issue_date).toLocaleDateString("en-LS") : "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                        <span style={{ color: COLORS.textMuted }}>Expiry Date</span>
                        <span style={{ fontWeight: 600 }}>{lic.expiry_date ? new Date(lic.expiry_date).toLocaleDateString("en-LS") : "—"}</span>
                      </div>
                    </div>

                    <button onClick={() => viewLicence(lic)} style={{
                      width: "100%", padding: "10px", border: 0,
                      background: COLORS.blue, color: "#fff",
                      borderRadius: 6, fontWeight: 700, fontSize: 13,
                      cursor: "pointer", fontFamily: "inherit"
                    }}>View & Download Licence</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* VEHICLES TAB */}
        {tab === "vehicles" && (
          <section style={section.wrapper}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={section.title}>My Vehicles</h2>
                <p style={section.subtitle}>Register new vehicles or view existing registrations.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => openServiceModal("IMPORTED_VEHICLE_REGISTRATION")} style={btnOutline}>Import</button>
                <button onClick={() => openServiceModal("OWNERSHIP_TRANSFER")} style={btnOutline}>Transfer</button>
                <button onClick={() => openServiceModal("VEHICLE_REGISTRATION")} style={btnPrimary}>+ Register</button>
              </div>
            </div>

            {vehicles.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No vehicles registered.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Registration", "Make & Model", "Year", "Type", "Registered", "Expiry", "Status"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.vehicle_id}>
                        <td style={tdStyle}><strong>{v.registration_number || "—"}</strong></td>
                        <td style={tdStyle}>{v.make} {v.model}</td>
                        <td style={tdStyle}>{v.manufacture_year || "—"}</td>
                        <td style={tdStyle}>{v.vehicle_type}</td>
                        <td style={tdStyle}>{v.registered_on ? new Date(v.registered_on).toLocaleDateString("en-LS") : "—"}</td>
                        <td style={tdStyle}>{v.expiry_date ? new Date(v.expiry_date).toLocaleDateString("en-LS") : "—"}</td>
                        <td style={tdStyle}><StatusBadge status={v.registration_status || "PENDING"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* FINES TAB */}
        {tab === "fines" && (
          <section style={section.wrapper}>
            <h2 style={section.title}>Traffic Fines</h2>
            <p style={section.subtitle}>All fines issued against your name or vehicle.</p>

            {fines.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No fines on record. You're all clear! ✓
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Reference", "Vehicle", "Offence", "Date", "Amount", "Status", "Action"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map(f => (
                      <tr key={f.fine_id}>
                        <td style={tdStyle}><strong>{f.fine_reference}</strong></td>
                        <td style={tdStyle}>{f.vehicle_registration || "—"}</td>
                        <td style={tdStyle}>{f.offence_description}</td>
                        <td style={tdStyle}>{f.offence_date ? new Date(f.offence_date).toLocaleDateString("en-LS") : "—"}</td>
                        <td style={tdStyle}>M {Number(f.amount).toLocaleString()}</td>
                        <td style={tdStyle}><StatusBadge status={f.fine_status} /></td>
                        <td style={tdStyle}>
                          {f.fine_status === "UNPAID" && (
                            <button onClick={() => setPayFineModal(f)} style={btnSmall}>Pay</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <section style={section.wrapper}>
            <h2 style={section.title}>My Payments</h2>
            <p style={section.subtitle}>Payment history for traffic services and fines.</p>

            {payments.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No payments recorded.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Reference", "Purpose", "Amount", "Method", "Status", "Date"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.payment_id}>
                        <td style={tdStyle}><strong>{p.payment_reference}</strong></td>
                        <td style={tdStyle}>{p.payment_purpose}</td>
                        <td style={tdStyle}>M {Number(p.amount).toLocaleString()}</td>
                        <td style={tdStyle}>{p.payment_method?.replace(/_/g, " ")}</td>
                        <td style={tdStyle}><StatusBadge status={p.payment_status} /></td>
                        <td style={tdStyle}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-LS") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* COMPLAINTS TAB */}
        {tab === "complaints" && (
          <section style={section.wrapper}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={section.title}>My Complaints</h2>
                <p style={section.subtitle}>Submit and track complaints / enquiries.</p>
              </div>
              <button onClick={() => setShowComplaintModal(true)} style={btnPrimary}>+ New Complaint</button>
            </div>

            {complaints.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No complaints submitted.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {complaints.map(c => (
                  <article key={c.complaint_id} style={{
                    background: "#fff", border: `1px solid ${COLORS.border}`,
                    borderRadius: 12, padding: 18
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.blue, fontFamily: "Consolas, monospace" }}>
                        {c.reference_number}
                      </span>
                      <StatusBadge status={c.complaint_status} />
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{c.subject}</h3>
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: COLORS.textMuted }}>
                      {c.complaint_type?.replace(/_/g, " ")} · Submitted {new Date(c.created_at).toLocaleDateString()}
                    </p>
                    {c.admin_response && (
                      <div style={{
                        padding: 12, background: "#eff8ff",
                        borderRadius: 8, fontSize: 13, color: COLORS.textMid
                      }}>
                        <strong>Response:</strong> {c.admin_response}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <section style={section.wrapper}>
            <h2 style={section.title}>Notifications</h2>
            <p style={section.subtitle}>Updates about applications, appointments and payments.</p>

            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No notifications.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {notifications.map(n => (
                  <article key={n.notification_id} style={{
                    background: n.read_at ? "#fff" : "#eff8ff",
                    border: `1px solid ${n.read_at ? COLORS.border : COLORS.blue}`,
                    borderRadius: 10, padding: 16
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <strong style={{ fontSize: 14, color: COLORS.textDark }}>{n.title}</strong>
                      <small style={{ color: COLORS.textMuted, fontSize: 11 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                      </small>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textMid }}>
                      {n.message}
                    </p>
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
            )}
          </section>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && me && (
          <section style={section.wrapper}>
            <h2 style={section.title}>My Profile</h2>
            <p style={section.subtitle}>Your verified identity on the Lesotho Government Services platform.</p>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 20 }}>
              {/* ID Card */}
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
                    <p style={{ margin: 0, fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.85 }}>
                      Kingdom of Lesotho
                    </p>
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
                      <img src={me.photo_url} alt="ID" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 700 }}>NO PHOTO</span>
                    )}
                  </div>
                </div>

                <div>
                  <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>ID NUMBER</p>
                  <p style={{ margin: "2px 0 10px", fontSize: 16, fontWeight: 700, letterSpacing: 1.4, fontFamily: "Consolas, monospace" }}>
                    {me.national_id_number || me.national_id || "—"}
                  </p>
                  <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>NAME</p>
                  <p style={{ margin: "2px 0 10px", fontSize: 13, fontWeight: 600 }}>
                    {me.full_name}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div>
                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 24, marginBottom: 20
                }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.blue, fontWeight: 700 }}>
                    Profile Details
                  </h3>
                  <ProfileRow label="Full Name" value={me.full_name} />
                  <ProfileRow label="Email" value={me.email || "—"} />
                  <ProfileRow label="Phone" value={me.phone || "—"} />
                  <ProfileRow label="National ID" value={me.national_id_number || me.national_id || "—"} />
                  <ProfileRow label="Account Status" value={me.account_status} />
                  <ProfileRow label="Member Since" value={new Date(me.created_at).toLocaleDateString()} />
                </div>

                <div style={{
                  background: "#fff", border: `1px solid ${COLORS.border}`,
                  borderRadius: 12, padding: 24
                }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 14, color: COLORS.blue, fontWeight: 700 }}>
                    Identity Photo
                  </h3>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                    Upload a clear, front-facing photo. This photo will appear on your driver's licence.
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
                        <img src={me.photo_url} alt="My photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 10, color: COLORS.textMuted, textAlign: "center", padding: 6 }}>
                          No photo yet
                        </span>
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
                      <label htmlFor="photo-upload-input" style={{
                        display: "inline-block",
                        padding: "11px 20px",
                        background: COLORS.blue,
                        color: "#fff",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: photoUploading ? "wait" : "pointer",
                        opacity: photoUploading ? 0.6 : 1
                      }}>
                        {photoUploading ? "Uploading…" : me.photo_url ? "Replace Photo" : "Upload Photo"}
                      </label>
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: COLORS.textMuted }}>
                        JPG or PNG · max 5 MB
                      </p>
                      {photoError && (
                        <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.error }}>{photoError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* NEW APPLICATION MODAL */}
      {showNewApplication && (
        <Overlay onClose={() => setShowNewApplication(false)}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {SERVICE_CONFIG[selectedServiceType]?.label || "New Traffic Application"}
          </h2>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.textMuted }}>
            Complete the form and submit your application.
          </p>

          {selectedServiceType && (
            <div style={{
              display: "flex", gap: 16, flexWrap: "wrap",
              padding: "10px 14px", background: "#eff8ff",
              borderRadius: 8, marginBottom: 18, fontSize: 12,
              color: COLORS.textMid, fontWeight: 600
            }}>
              <span>Fee: <strong>M {SERVICE_CONFIG[selectedServiceType]?.fee || 0}</strong></span>
            </div>
          )}

          <form onSubmit={submitApplication}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Service Type *</label>
              <select
                value={selectedServiceType}
                onChange={e => {
                  setSelectedServiceType(e.target.value);
                  setFormFields({});
                  setFormTitle(SERVICE_CONFIG[e.target.value]?.label || "");
                }}
                required
                style={inputStyle}
              >
                <option value="">Select a service…</option>
                {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label} (M {cfg.fee})</option>
                ))}
              </select>
            </div>

            {selectedServiceType && SERVICE_CONFIG[selectedServiceType].fields.map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  {field.label}{field.required ? " *" : ""}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={formFields[field.key] || ""}
                    onChange={e => setFormFields({ ...formFields, [field.key]: e.target.value })}
                    required={field.required}
                    rows={3}
                    style={inputStyle}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formFields[field.key] || ""}
                    onChange={e => setFormFields({ ...formFields, [field.key]: e.target.value })}
                    required={field.required}
                    style={inputStyle}
                  >
                    <option value="">Select…</option>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formFields[field.key] || ""}
                    onChange={e => setFormFields({ ...formFields, [field.key]: e.target.value })}
                    required={field.required}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}

            {selectedServiceType && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Application Title *</label>
                  <input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Additional Notes</label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Anything else we should know…"
                    rows={2}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Urgency</label>
                  <select value={formUrgency} onChange={e => setFormUrgency(e.target.value)} style={inputStyle}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Supporting Documents</label>
                  <input
                    type="file"
                    multiple
                    onChange={e => setExtraDocs(Array.from(e.target.files || []))}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowNewApplication(false)} style={btnOutline}>
                Cancel
              </button>
              <button type="submit" disabled={!selectedServiceType} style={btnPrimary}>
                Submit Application
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {/* LICENCE VIEW MODAL */}
      {licenceView && (
        <Overlay onClose={() => setLicenceView(null)}>
          <LicenceView licence={licenceView} me={me} onClose={() => setLicenceView(null)} />
        </Overlay>
      )}

      {/* APPLICATION DETAIL MODAL */}
      {selectedApp && detail && (
        <Overlay onClose={() => { setSelectedApp(null); setDetail(null); }}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>
            {selectedApp.reference_number}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textMuted }}>
            {selectedApp.title} · {selectedApp.application_type?.replace(/_/g, " ")}
          </p>

          <ProfileRow label="Status" value={selectedApp.status?.replace(/_/g, " ")} />
          <ProfileRow label="Submitted" value={new Date(selectedApp.submitted_at).toLocaleString()} />
          {selectedApp.admin_notes && (
            <ProfileRow label="Officer Note" value={selectedApp.admin_notes} />
          )}

          <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>Submitted Information</h3>
          {detail.values?.map(v => (
            <ProfileRow key={v.field_key} label={v.field_key.replace(/_/g, " ")} value={v.field_value} />
          ))}

          {detail.documents?.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, color: COLORS.blue, marginTop: 18 }}>Documents</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13 }}>
                {detail.documents.map(d => (
                  <li key={d.document_id}>
                    <a href={`${API_BASE.replace("/api", "")}${d.storage_path}`} target="_blank" rel="noreferrer" style={{ color: COLORS.blue }}>
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

      {/* COMPLAINT MODAL */}
      {showComplaintModal && (
        <Overlay onClose={() => setShowComplaintModal(false)}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>Submit a Complaint</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.textMuted }}>
            We respond within 5 business days.
          </p>

          <form onSubmit={submitComplaint}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Complaint Type *</label>
              <select
                value={complaintForm.type}
                onChange={e => setComplaintForm({ ...complaintForm, type: e.target.value })}
                style={inputStyle}
              >
                <option value="DELAY">Delay in processing</option>
                <option value="PAYMENT">Payment issue</option>
                <option value="RECORD_ERROR">Incorrect record</option>
                <option value="STAFF_SERVICE">Staff service</option>
                <option value="LICENCE">Licence issue</option>
                <option value="REGISTRATION">Vehicle registration issue</option>
                <option value="INSPECTION">Inspection issue</option>
                <option value="PERMIT">Permit issue</option>
                <option value="SCHOOL_INSTRUCTOR">Driving school / instructor</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Subject *</label>
              <input
                value={complaintForm.subject}
                onChange={e => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={complaintForm.description}
                onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}
                required
                rows={4}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setShowComplaintModal(false)} style={btnOutline}>
                Cancel
              </button>
              <button type="submit" style={btnPrimary}>Submit Complaint</button>
            </div>
          </form>
        </Overlay>
      )}

      {/* PAY FINE MODAL */}
      {payFineModal && (
        <Overlay onClose={() => setPayFineModal(null)}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>Pay Traffic Fine</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.textMuted }}>
            Fine {payFineModal.fine_reference} · M {Number(payFineModal.amount).toLocaleString()}
          </p>

          <form onSubmit={submitFinePayment}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Payment Method *</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={inputStyle}>
                <option value="MOBILE_MONEY">Mobile Money (M-Pesa / EcoCash)</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Transaction Reference (optional)</label>
              <input
                value={payRef}
                onChange={e => setPayRef(e.target.value)}
                placeholder="e.g. MPESA-12345"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setPayFineModal(null)} style={btnOutline}>
                Cancel
              </button>
              <button type="submit" style={btnPrimary}>
                Pay M {Number(payFineModal.amount).toLocaleString()}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {/* TRACK MODAL */}
      {showTrackModal && (
        <Overlay onClose={() => setShowTrackModal(false)}>
          <h2 style={{ margin: "0 0 4px", color: COLORS.blue }}>Track by Reference</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.textMuted }}>
            Enter your application, fine, or complaint reference.
          </p>

          <form onSubmit={trackApplication}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Reference Number</label>
              <input
                value={trackRef}
                onChange={e => setTrackRef(e.target.value)}
                placeholder="e.g. TDL-2025-000001"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setShowTrackModal(false)} style={btnOutline}>
                Close
              </button>
              <button type="submit" style={btnPrimary}>Track</button>
            </div>
          </form>

          {trackResult && (
            <div style={{ marginTop: 20, padding: 16, borderRadius: 8, background: "#eff8ff", border: "1px solid #b2ddff" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{trackResult.reference}</p>
              <p style={{ margin: "0 0 6px", fontSize: 13 }}>Type: {trackResult.type}</p>
              <p style={{ margin: "0 0 6px", fontSize: 13 }}>
                Status: <StatusBadge status={trackResult.status} />
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>
                Submitted: {trackResult.submitted_at ? new Date(trackResult.submitted_at).toLocaleString("en-LS") : "—"}
              </p>
            </div>
          )}
        </Overlay>
      )}
    </main>
  );
}

// ============================================================
// LICENCE VIEW COMPONENT WITH PDF DOWNLOAD
// ============================================================
function LicenceView({ licence, me, onClose }) {
  const { ref, download, downloading } = usePdfDownload();

  const licenceNumber = licence.licence_number || "PENDING";
  const category = licence.licence_category || "B";
  const issueDate = licence.issue_date ? new Date(licence.issue_date).toLocaleDateString("en-LS") : "—";
  const expiryDate = licence.expiry_date ? new Date(licence.expiry_date).toLocaleDateString("en-LS") : "—";

  return (
    <div>
      <div ref={ref} style={{
        background: "linear-gradient(135deg, #1a5276 0%, #0d3d56 100%)",
        color: "#fff", borderRadius: 12, padding: 24,
        maxWidth: 520, margin: "0 auto",
        boxShadow: "0 12px 28px rgba(0,0,0,0.25)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", opacity: 0.85 }}>
              Kingdom of Lesotho
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700 }}>
              Driver's Licence
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 9, opacity: 0.7 }}>
              Department of Traffic & Transport
            </p>
          </div>
          
          {/* Photo */}
          <div style={{
            width: 80, height: 100, borderRadius: 4,
            background: "rgba(255,255,255,0.15)",
            display: "grid", placeItems: "center",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.3)"
          }}>
            {me?.photo_url ? (
              <img 
                src={me.photo_url} 
                alt="Holder" 
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <span style={{ fontSize: 9, fontWeight: 700, textAlign: "center", padding: 4 }}>
                NO PHOTO
              </span>
            )}
          </div>
        </div>

        {/* Licence Number */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>LICENCE NUMBER</p>
          <p style={{
            margin: "4px 0 0", fontSize: 22, fontWeight: 700,
            letterSpacing: 2, fontFamily: "Consolas, monospace"
          }}>{licenceNumber}</p>
        </div>

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>SURNAME & NAMES</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600 }}>
              {me?.full_name || "—"}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 9, opacity: 0.75, letterSpacing: 1 }}>NATIONAL ID</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, fontFamily: "Consolas, monospace" }}>
              {me?.national_id_number || me?.national_id || "—"}
            </p>
          </div>
        </div>

        {/* Category & Dates */}
        <div style={{ 
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.2)",
          borderBottom: "1px solid rgba(255,255,255,0.2)", marginBottom: 20
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 8, opacity: 0.7, letterSpacing: 0.5 }}>CATEGORY</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700 }}>
              {category}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 8, opacity: 0.7, letterSpacing: 0.5 }}>ISSUE DATE</p>
            <p style={{ margin: "2px 0 0", fontSize: 12 }}>
              {issueDate}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 8, opacity: 0.7, letterSpacing: 0.5 }}>EXPIRY DATE</p>
            <p style={{ margin: "2px 0 0", fontSize: 12 }}>
              {expiryDate}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ margin: 0, fontSize: 8, opacity: 0.6 }}>
              This licence is the property of the Kingdom of Lesotho.
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 8, opacity: 0.6 }}>
              If found, please return to the nearest Traffic Office.
            </p>
          </div>
          <div style={{
            width: 50, height: 50, borderRadius: "50%",
            border: "2px dashed rgba(255,255,255,0.4)",
            display: "grid", placeItems: "center",
            fontSize: 7, textAlign: "center", opacity: 0.7
          }}>
            OFFICIAL<br />SEAL
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onClose} style={btnOutline}>Close</button>
        <button
          onClick={() => download(`Drivers-Licence-${licenceNumber}.pdf`)}
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
// PDF DOWNLOAD HOOK
// ============================================================
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

function ShortcutButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "16px 18px", fontSize: 13, fontWeight: 600,
      color: COLORS.blue, background: "#eff8ff",
      border: "1px solid #b2ddff", borderRadius: 10,
      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
      transition: "all 0.15s"
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "8px 0", borderBottom: `1px solid ${COLORS.borderLight}`,
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
    DRAFT: { bg: "#f1f5f9", fg: "#475569" },
    SUBMITTED: { bg: "#eff8ff", fg: "#175cd3" },
    UNDER_REVIEW: { bg: "#fff4df", fg: "#b45309" },
    DOCUMENTS_REQUIRED: { bg: "#fff4df", fg: "#b45309" },
    APPOINTMENT_REQUIRED: { bg: "#fff4df", fg: "#b45309" },
    PAYMENT_PENDING: { bg: "#fff4df", fg: "#b45309" },
    APPROVED: { bg: "#ecfdf3", fg: "#067647" },
    REJECTED: { bg: "#fdecea", fg: "#b3261e" },
    PROCESSING: { bg: "#e6f4f1", fg: "#0f766e" },
    READY_FOR_COLLECTION: { bg: "#ecfdf3", fg: "#067647" },
    COMPLETED: { bg: "#f0edfc", fg: "#6651aa" },
    CANCELLED: { bg: "#f1f5f9", fg: "#475569" },
    PAID: { bg: "#ecfdf3", fg: "#067647" },
    UNPAID: { bg: "#fdecea", fg: "#b3261e" },
    VALID: { bg: "#ecfdf3", fg: "#067647" },
    EXPIRED: { bg: "#fdecea", fg: "#b3261e" },
    ACTIVE: { bg: "#ecfdf3", fg: "#067647" },
    PENDING: { bg: "#fff4df", fg: "#b45309" },
    CLEARED: { bg: "#ecfdf3", fg: "#067647" },
    OPEN: { bg: "#fff4df", fg: "#b45309" },
    IN_REVIEW: { bg: "#fff4df", fg: "#b45309" },
    RESOLVED: { bg: "#ecfdf3", fg: "#067647" },
    REGISTERED: { bg: "#ecfdf3", fg: "#067647" },
    SUSPENDED: { bg: "#fdecea", fg: "#b3261e" },
    PASS: { bg: "#ecfdf3", fg: "#067647" },
    FAIL: { bg: "#fdecea", fg: "#b3261e" },
    PASSED: { bg: "#ecfdf3", fg: "#067647" },
    FAILED: { bg: "#fdecea", fg: "#b3261e" }
  };
  const s = map[status?.toUpperCase()] || { bg: "#f1f5f9", fg: "#475569" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      background: s.bg, color: s.fg, borderRadius: 20,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: 0.4, whiteSpace: "nowrap"
    }}>{status?.replace(/_/g, " ")}</span>
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
      }}>{children}</div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
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

const btnSmall = {
  padding: "6px 14px", border: 0, background: COLORS.blue,
  color: "#fff", borderRadius: 6, cursor: "pointer",
  fontWeight: 700, fontSize: 12, fontFamily: "inherit"
};

export default TrafficDashboard;
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  signInWithCustomToken,
  signInWithPopup,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  EmailAuthProvider,
  linkWithCredential
} from "firebase/auth";
import {
  auth,
  googleProvider,
  API_BASE
} from "../Database/firebase";

const COLORS = {
  blue: "#00209F",
  white: "#FFFFFF",
  green: "#009543",
  black: "#000000",
  lightBg: "#F1F6F4",
  border: "#CBD5D1",
  textMuted: "#66736F",
  error: "#B3261E"
};

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 7,
  fontSize: 15,
  outline: "none"
};

const buttonStyle = (bg) => ({
  width: "100%",
  padding: 14,
  border: 0,
  borderRadius: 7,
  background: bg,
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 10
});
const RECAPTCHA_CONTAINER_ID = "register-recaptcha-container";

function Register({ onSuccess, getPostAuthRoute }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(
    location.state?.prefill?.name?.split(" ")[0] || ""
  );
  const [lastName, setLastName] = useState(
    location.state?.prefill?.name?.split(" ").slice(1).join(" ") || ""
  );
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("+266");
  const [authMode, setAuthMode] = useState("email");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaRef = React.useRef(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resolvePostAuthRoute() {
    const fromMinistry =
      typeof getPostAuthRoute === "function" ? getPostAuthRoute() : null;
    const fromState = location.state?.from?.pathname;
    return fromMinistry || fromState || "/home-affairs-dashboard";
  }

  async function saveProfileToBackend(firebaseUser, overrides = {}) {
    const token = await firebaseUser.getIdToken();

    const finalFirstName = overrides.firstName || firstName || "";
    const finalLastName = overrides.lastName || lastName || "";
    const fullName =
      overrides.fullName ||
      `${finalFirstName} ${finalLastName}`.trim() ||
      firebaseUser.displayName ||
      "Unknown User";

    const body = { full_name: fullName, national_id: nationalId.trim(),
      password, phone: firebaseUser.phoneNumber || (authMode === "phone" ? phone : "") };

    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save profile");

    sessionStorage.setItem("home-affairs-authenticated", "true");
    sessionStorage.setItem("firebase-uid", firebaseUser.uid);
    sessionStorage.setItem("account-type", data.user?.account_type || "citizen");
    sessionStorage.setItem("user-profile", JSON.stringify(data.user || {}));

    if (data.isAdmin) {
      sessionStorage.setItem("is-admin", "true");
    } else {
      sessionStorage.removeItem("is-admin");
    }

    onSuccess?.();

    const nextRoute = resolvePostAuthRoute();
    navigate(nextRoute, { replace: true });
  }

  async function handleEmailRegister(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      if (!/^10\d{10}$/.test(nationalId.trim())) throw new Error("Enter the 12-digit National ID issued by Home Affairs.");
      const registration = await fetch(`${API_BASE}/auth/register-national-id`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ national_id: nationalId.trim(), full_name: `${firstName} ${lastName}`.trim(), password })
      });
      const registrationData = await registration.json();
      if (!registration.ok) throw new Error(registrationData.error || "National ID registration failed.");
      const cred = await signInWithCustomToken(auth, registrationData.token);
      await updateProfile(cred.user, {
        displayName: registrationData.full_name || `${firstName} ${lastName}`
      });
      await saveProfileToBackend(cred.user, { fullName: registrationData.full_name || `${firstName} ${lastName}` });
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPhoneCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const verifier = recaptchaRef.current || new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: "invisible" });
      recaptchaRef.current = verifier;
      setConfirmationResult(await signInWithPhoneNumber(auth, phone, verifier));
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally { setLoading(false); }
  }

  async function handlePhoneRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const credential = await confirmationResult.confirm(otp);
      if (password !== confirmPassword || password.length < 8) throw new Error("Choose a password of at least 8 characters and confirm it.");
      await updateProfile(credential.user, { displayName: `${firstName} ${lastName}`.trim() });
      await saveProfileToBackend(credential.user, { fullName: `${firstName} ${lastName}`.trim() });
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally { setLoading(false); }
  }

  async function handleGoogleRegister() {
    setError("");

    setLoading(true);
    try {
      if (password !== confirmPassword || password.length < 8) throw new Error("Choose a password of at least 8 characters and confirm it.");
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (!user.email) throw new Error("This Google account must have an email address to register.");
      const linked = await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));

      const nameParts = (linked.user.displayName || "").split(" ");
      const firstNameVal = firstName || nameParts[0] || "";
      const lastNameVal = lastName || nameParts.slice(1).join(" ") || "";

      if (!firstName && firstNameVal) setFirstName(firstNameVal);
      if (!lastName && lastNameVal) setLastName(lastNameVal);

      await saveProfileToBackend(linked.user, {
        firstName: firstNameVal,
        lastName: lastNameVal
      });
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 24,
      boxSizing: "border-box",
      background: COLORS.lightBg,
      fontFamily: "Arial, sans-serif"
    }}>
      {/* Split Screen Container */}
      <section style={{
        width: "100%",
        maxWidth: 1060,
        display: "grid",
        gridTemplateColumns: "1fr 1.1fr",
        background: COLORS.white,
        borderRadius: 16,
        boxShadow: "0 16px 40px rgba(0, 32, 159, .12)",
        overflow: "hidden",
        borderTop: `5px solid ${COLORS.green}`
      }}>
        
        {/* Left Side: Informational & Branding Panel */}
        <div style={{
          background: "linear-gradient(135deg, #00209F 0%, #001257 100% )",
          color: COLORS.white,
          padding: "48px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{
              display: "flex", height: "6px", borderRadius: "3px",
              overflow: "hidden", marginBottom: 24, width: 120
            }}>
              <div style={{ flex: 1, background: COLORS.blue }} />
              <div style={{ flex: 1, background: COLORS.white }} />
              <div style={{ flex: 1, background: COLORS.green }} />
            </div>

            <p style={{
              margin: "0 0 8px", color: "#4ade80", fontSize: 12,
              fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase"
            }}>
              Official Digital Portal
            </p>
            <h2 style={{ margin: "0 0 16px", fontSize: 28, lineHeight: 1.2 }}>
              The Kingdom of Lesotho Single Identity
            </h2>
            <p style={{ margin: "0 0 32px", color: "#d1d5db", fontSize: 15, lineHeight: 1.6 }}>
              Access streamlined public services securely through a unified national profile.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { title: "Home Affairs & Passports", desc: "Track applications and renewals seamlessly." },
                { title: "Traffic & Transport", desc: "Manage driver licenses and vehicle registrations." },
                { title: "Pensions & Social Grants", desc: "Secure tracking for disbursements and support." },
                { title: "Police & Public Safety", desc: "Quick access to clearances and public services." }
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
                    display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#4ade80", flexShrink: 0
                  }}>✓</div>
                  <div>
                    <h4 style={{ margin: "0 0 2px", fontSize: 15, color: "#fff" }}>{item.title}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Container with Centered Back Button */}
          <div style={{ marginTop: 40, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Link
              to="/home-dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "transparent",
                color: "#FFFFFF",
                border: "1px solid #FFFFFF",
                borderRadius: 8,
                padding: "10px 24px",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                width: "fit-content",
                transition: "background 0.2s"
              }}
            >
              Home
            </Link>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
              Need assistance? Contact the Government Service Desk or call support numbers locally.
            </p>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div style={{ padding: "40px 44px", overflowY: "auto", maxHeight: "90vh" }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 8px", color: COLORS.blue, fontSize: 26 }}>
              Create an account
            </h1>
            <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 14, lineHeight: 1.5 }}>
              Enter your credential details to get started.
            </p>
          </header>

          <div id={RECAPTCHA_CONTAINER_ID} />
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["email", "phone"].map(method => (
              <button key={method} type="button" onClick={() => { setAuthMode(method); setError(""); }}
                style={{ ...buttonStyle(authMode === method ? (method === "phone" ? COLORS.green : COLORS.blue) : "#eef2f7"), color: authMode === method ? "#fff" : COLORS.textMuted, marginTop: 0 }}>
                Register with {method === "email" ? "email" : "phone"}
              </button>
            ))}
          </div>
          <form onSubmit={authMode === "phone" ? (otpSent ? handlePhoneRegister : handleSendPhoneCode) : handleEmailRegister}>
              <label style={{ display: "block", color: "#263b35", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                National ID issued by Home Affairs
                <input type="text" inputMode="numeric" autoComplete="off" required maxLength={12}
                  pattern="10[0-9]{10}" value={nationalId} onChange={e => setNationalId(e.target.value)}
                  placeholder="10XXXXXXXXXX" style={{ ...fieldStyle, display: "block", marginTop: 6 }} />
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14
              }}>
                <label style={{ color: "#263b35", fontSize: 13, fontWeight: 600 }}>
                  First name
                  <input type="text" autoComplete="given-name" required
                    value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    style={{ ...fieldStyle, display: "block", marginTop: 6 }} />
                </label>
                <label style={{ color: "#263b35", fontSize: 13, fontWeight: 600 }}>
                  Last name
                  <input type="text" autoComplete="family-name" required
                    value={lastName} onChange={(e) => setLastName(e.target.value)}
                    style={{ ...fieldStyle, display: "block", marginTop: 6 }} />
                </label>
                {authMode === "phone" && <label style={{ gridColumn: "1 / -1", color: "#263b35", fontSize: 13, fontWeight: 600 }}>
                  Phone number
                  <input type="tel" autoComplete="tel" required disabled={otpSent} value={phone}
                    onChange={e => setPhone(e.target.value)} style={{ ...fieldStyle, display: "block", marginTop: 6 }} />
                </label>}
                <label style={{ color: "#263b35", fontSize: 13, fontWeight: 600 }}>
                  Password
                  <input type="password" autoComplete="new-password" minLength={8} required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    style={{ ...fieldStyle, display: "block", marginTop: 6 }} />
                </label>
                <label style={{ color: "#263b35", fontSize: 13, fontWeight: 600 }}>
                  Confirm password
                  <input type="password" autoComplete="new-password" minLength={8} required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ ...fieldStyle, display: "block", marginTop: 6 }} />
                </label>
              </div>

              {authMode === "phone" && otpSent && <label style={{ display: "block", color: "#263b35", fontSize: 13, fontWeight: 600 }}>
                SMS verification code
                <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={otp}
                  onChange={e => setOtp(e.target.value)} style={{ ...fieldStyle, display: "block", marginTop: 6 }} />
              </label>}
              <p style={{ margin: "10px 0 6px", color: COLORS.textMuted, fontSize: 12 }}>
                Password must be at least 8 characters.
              </p>

              {error && <p role="alert" style={{ color: COLORS.error, fontSize: 13, margin: "6px 0" }}>{error}</p>}

              <button type="submit" disabled={loading} style={buttonStyle(COLORS.blue)}>
                {loading ? "Please wait..." : authMode === "phone" ? (otpSent ? "Verify code and create account" : "Send verification code") : "Create account"}
              </button>
          </form>

          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            margin: "18px 0", color: COLORS.textMuted, fontSize: 12
          }}>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            <span>OR</span>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          </div>

          <button
            type="button" onClick={handleGoogleRegister} disabled={loading}
            style={{
              width: "100%", padding: 12,
              border: `1px solid ${COLORS.border}`, borderRadius: 7,
              background: "#fff", color: "#333", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.8-5.3l-6.4-5.4C29.3 34.9 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.4 5.4C36.9 39.1 44 34 44 24c0-1.3-.1-2.5-.4-3.5z"/>
            </svg>
            Sign up with Google
          </button>

          <p style={{
            margin: "18px 0 0", textAlign: "center",
            color: COLORS.textMuted, fontSize: 13
          }}>
            Already have an account?{" "}
            <Link to="/login" state={location.state}
              style={{ color: COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>

      </section>
    </main>
  );
}

function prettyError(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use"))
    return "That email is already registered. Try signing in.";
  if (code.includes("weak-password")) return "Password is too weak.";
  if (code.includes("invalid-email")) return "Invalid email address.";
  if (code.includes("invalid-phone-number"))
    return "Invalid phone number format. Use +266...";
  if (code.includes("operation-not-allowed"))
    return "Phone SMS is disabled for this Firebase project or region. Enable Phone sign-in and allow SMS to Lesotho (+266) in Firebase Console > Authentication > Settings > SMS region policy.";
  if (code.includes("billing-not-enabled"))
    return "Firebase SMS requires a Cloud Billing account. Link billing to the lesotho-gov-services project in Google Cloud Console, then allow Lesotho (LS) in Firebase Authentication > Settings > SMS region policy. SMS charges may apply.";
  if (code.includes("popup-closed-by-user")) return "Google sign-up cancelled.";
  if (code.includes("invalid-verification-code")) return "Invalid OTP code.";
  return err?.message || "Something went wrong. Please try again.";
}

export default Register;

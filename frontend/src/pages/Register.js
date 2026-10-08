import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile
} from "firebase/auth";
import {
  auth,
  googleProvider,
  RECAPTCHA_CONTAINER_ID,
  API_BASE
} from "../Database/firebase";

// ============================================================
// LESOTHO FLAG COLORS
// ============================================================
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

function Register({ onSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [method, setMethod] = useState("email");

  const [firstName, setFirstName] = useState(location.state?.prefill?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(location.state?.prefill?.name?.split(" ").slice(1).join(" ") || "");
  const [email, setEmail] = useState(location.state?.prefill?.email || "");
  const [phone, setPhone] = useState(location.state?.prefill?.phone || "+266");
  const [identityNumber, setIdentityNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (method === "phone" && !recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        auth,
        RECAPTCHA_CONTAINER_ID,
        { size: "invisible" }
      );
    }
  }, [method]);

  async function saveProfileToBackend(firebaseUser, overrides = {}) {
    const token = await firebaseUser.getIdToken();

    const body = {
      nationalId: identityNumber,
      firstName,
      lastName,
      phone: phone || overrides.phone || null,
      ...overrides
    };

    const res = await fetch(`${API_BASE}/register/citizen`, {
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
    sessionStorage.setItem("account-type", "citizen");

    onSuccess?.();
    navigate(location.state?.from?.pathname || "/home-dashboard");
  }

  async function handleEmailRegister(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!identityNumber.trim()) {
      setError("ID or passport number is required.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });
      await saveProfileToBackend(cred.user);
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError("");
    setInfo("");

    if (!identityNumber.trim()) {
      setError("Please enter your ID or passport number before continuing with Google.");
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;

      const nameParts = (user.displayName || "").split(" ");
      if (!firstName && nameParts[0]) setFirstName(nameParts[0]);
      if (!lastName && nameParts.length > 1) setLastName(nameParts.slice(1).join(" "));

      await saveProfileToBackend(user, {
        email: user.email,
        firstName: firstName || nameParts[0],
        lastName: lastName || nameParts.slice(1).join(" ")
      });
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!identityNumber.trim()) {
      setError("Please enter your ID or passport number before requesting an OTP.");
      return;
    }
    if (!phone || phone.length < 8) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      await fetch(`${API_BASE}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "registration" })
      }).catch(() => {});

      const verifier =
        recaptchaRef.current ||
        new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: "invisible" });

      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setInfo("OTP sent. Check your SMS.");
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;

      const token = await firebaseUser.getIdToken();
      await fetch(`${API_BASE}/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }).catch(() => {});

      await saveProfileToBackend(firebaseUser, {
        phone: firebaseUser.phoneNumber || phone
      });
    } catch (err) {
      console.error(err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        boxSizing: "border-box",
        background: COLORS.lightBg,
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div id={RECAPTCHA_CONTAINER_ID}></div>

      <section
        style={{
          width: "100%",
          maxWidth: 660,
          boxSizing: "border-box",
          padding: "36px 40px",
          background: COLORS.white,
          borderRadius: 14,
          boxShadow: "0 12px 36px rgba(0, 32, 159, .15)",
          borderTop: `5px solid ${COLORS.green}`
        }}
      >
        <header style={{ marginBottom: 26 }}>
          <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: 18 }}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{ flex: 1, background: COLORS.white, borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>

          <p style={{ margin: "0 0 8px", color: COLORS.blue, fontSize: 12, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase" }}>
            Lesotho Government Services
          </p>
          <h1 style={{ margin: "0 0 8px", color: COLORS.blue, fontSize: 30 }}>
            Create an account
          </h1>
          <p style={{ margin: 0, color: COLORS.textMuted, lineHeight: 1.5 }}>
            One account for Home Affairs, Passport, Traffic, Pensions, Police and Finance.
          </p>
        </header>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 22,
            background: COLORS.lightBg,
            padding: 4,
            borderRadius: 8
          }}
        >
          <button
            type="button"
            onClick={() => { setMethod("email"); setError(""); setInfo(""); setOtpSent(false); }}
            style={{
              flex: 1, padding: 10, border: 0, borderRadius: 6,
              background: method === "email" ? COLORS.blue : "transparent",
              color: method === "email" ? "#fff" : COLORS.textMuted,
              fontWeight: 700, cursor: "pointer"
            }}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => { setMethod("phone"); setError(""); setInfo(""); }}
            style={{
              flex: 1, padding: 10, border: 0, borderRadius: 6,
              background: method === "phone" ? COLORS.green : "transparent",
              color: method === "phone" ? "#fff" : COLORS.textMuted,
              fontWeight: 700, cursor: "pointer"
            }}
          >
            Phone OTP
          </button>
        </div>

        {method === "email" && (
          <form onSubmit={handleEmailRegister}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18 }}>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                First name
                <input
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                Last name
                <input
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                Phone number
                <input
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ gridColumn: "1 / -1", color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                ID or passport number
                <input
                  type="text"
                  autoComplete="off"
                  required
                  value={identityNumber}
                  onChange={(e) => setIdentityNumber(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                Password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
            </div>

            <p style={{ margin: "12px 0 8px", color: COLORS.textMuted, fontSize: 13 }}>
              Password must be at least 8 characters.
            </p>

            {error && <p role="alert" style={{ color: COLORS.error, fontSize: 14 }}>{error}</p>}

            <button type="submit" disabled={loading} style={buttonStyle(COLORS.blue)}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        {method === "phone" && (
          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 18 }}>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                First name
                <input
                  type="text"
                  required
                  disabled={otpSent}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                Last name
                <input
                  type="text"
                  required
                  disabled={otpSent}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ gridColumn: "1 / -1", color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                ID or passport number
                <input
                  type="text"
                  required
                  disabled={otpSent}
                  value={identityNumber}
                  onChange={(e) => setIdentityNumber(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              <label style={{ gridColumn: "1 / -1", color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                Phone number
                <input
                  type="tel"
                  required
                  disabled={otpSent}
                  placeholder="+26658000001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                />
              </label>
              {otpSent && (
                <label style={{ gridColumn: "1 / -1", color: "#263b35", fontSize: 14, fontWeight: 600 }}>
                  Enter OTP
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    style={{ ...fieldStyle, display: "block", marginTop: 7 }}
                  />
                </label>
              )}
            </div>

            {error && <p role="alert" style={{ color: COLORS.error, fontSize: 14, marginTop: 12 }}>{error}</p>}
            {info && !error && <p style={{ color: COLORS.green, fontSize: 14, marginTop: 12 }}>{info}</p>}

            <button type="submit" disabled={loading} style={buttonStyle(COLORS.green)}>
              {loading ? "Please wait..." : otpSent ? "Verify OTP & Create account" : "Send OTP"}
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(""); setInfo(""); }}
                style={{
                  ...buttonStyle("transparent"),
                  color: COLORS.blue,
                  border: `1px solid ${COLORS.blue}`
                }}
              >
                Use different number
              </button>
            )}
          </form>
        )}

        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            margin: "22px 0", color: COLORS.textMuted, fontSize: 13
          }}
        >
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          <span>OR</span>
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 7,
            background: "#fff",
            color: "#333",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10
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

        <p style={{ margin: "22px 0 0", textAlign: "center", color: COLORS.textMuted, fontSize: 14 }}>
          Already have an account?{" "}
          <Link to="/login" state={location.state} style={{ color: COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

function prettyError(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "That email is already registered. Try signing in.";
  if (code.includes("weak-password")) return "Password is too weak.";
  if (code.includes("invalid-email")) return "Invalid email address.";
  if (code.includes("invalid-phone-number")) return "Invalid phone number format. Use +266...";
  if (code.includes("popup-closed-by-user")) return "Google sign-up cancelled.";
  if (code.includes("invalid-verification-code")) return "Invalid OTP code.";
  return err?.message || "Something went wrong. Please try again.";
}

export default Register;
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier
} from "firebase/auth";
import {
  auth,
  googleProvider,
  RECAPTCHA_CONTAINER_ID,
  API_BASE
} from "../Database/firebase";

const COLORS = {
  blue: "#00209F",
  white: "#FFFFFF",
  green: "#009543",
  black: "#000000",
  lightBg: "#F4F7FB",
  border: "#CBD5E1",
  textMuted: "#64748B",
  error: "#B3261E"
};

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  padding: "12px 14px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: "6px",
  fontSize: "16px",
  outline: "none"
};

const buttonStyle = (bg) => ({
  width: "100%",
  padding: "13px",
  border: 0,
  borderRadius: "6px",
  background: bg,
  color: "#fff",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: "8px"
});

function Login({ onSuccess, getPostAuthRoute }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("+266");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (mode === "phone" && !recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        auth,
        RECAPTCHA_CONTAINER_ID,
        { size: "invisible" }
      );
    }
  }, [mode]);

  function resolvePostAuthRoute() {
    const fromMinistry =
      typeof getPostAuthRoute === "function" ? getPostAuthRoute() : null;
    const fromState = location.state?.from?.pathname;
    return fromMinistry || fromState || "/home-affairs-dashboard";
  }

  async function completeLogin(firebaseUser) {
    const token = await firebaseUser.getIdToken();
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.code === "NOT_REGISTERED") {
        navigate("/register", {
          state: { from: location.state?.from, prefill: data }
        });
        return;
      }
      throw new Error(data.error || "Login failed");
    }

    // Persist
    sessionStorage.setItem("home-affairs-authenticated", "true");
    sessionStorage.setItem("firebase-uid", data.user.firebase_uid);
    sessionStorage.setItem("account-type", data.user.account_type);
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

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await completeLogin(cred.user);
    } catch (err) {
      console.error(err);
      setError(prettyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await completeLogin(cred.user);
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
    setLoading(true);
    try {
      await fetch(`${API_BASE}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" })
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

      await completeLogin(firebaseUser);
    } catch (err) {
      console.error(err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      background: COLORS.lightBg,
      fontFamily: "Arial, sans-serif"
    }}>
      <div id={RECAPTCHA_CONTAINER_ID}></div>

      <section
        aria-labelledby="login-title"
        style={{
          width: "100%",
          maxWidth: "440px",
          boxSizing: "border-box",
          padding: "36px",
          borderRadius: "12px",
          background: COLORS.white,
          boxShadow: "0 8px 28px rgba(0, 32, 159, 0.12)",
          borderTop: `5px solid ${COLORS.blue}`
        }}
      >
        <header style={{ marginBottom: "24px", textAlign: "center" }}>
          <div style={{
            display: "flex", height: "6px", borderRadius: "3px",
            overflow: "hidden", marginBottom: "18px"
          }}>
            <div style={{ flex: 1, background: COLORS.blue }} />
            <div style={{
              flex: 1, background: COLORS.white,
              borderTop: `1px solid ${COLORS.border}`,
              borderBottom: `1px solid ${COLORS.border}`
            }} />
            <div style={{ flex: 1, background: COLORS.green }} />
          </div>

          <h1 id="login-title" style={{ margin: "0 0 6px", color: COLORS.blue, fontSize: "26px" }}>
            Welcome back
          </h1>
          <p style={{ margin: 0, color: COLORS.textMuted, fontSize: "14px" }}>
            Sign in to Lesotho Government Services
          </p>
        </header>

        <div style={{
          display: "flex", gap: "8px", marginBottom: "24px",
          background: COLORS.lightBg, padding: "4px", borderRadius: "8px"
        }}>
          <button
            type="button"
            onClick={() => { setMode("email"); setError(""); setInfo(""); }}
            style={{
              flex: 1, padding: "10px", border: 0, borderRadius: "6px",
              background: mode === "email" ? COLORS.blue : "transparent",
              color: mode === "email" ? "#fff" : COLORS.textMuted,
              fontWeight: 700, cursor: "pointer"
            }}
          >Email</button>
          <button
            type="button"
            onClick={() => { setMode("phone"); setError(""); setInfo(""); }}
            style={{
              flex: 1, padding: "10px", border: 0, borderRadius: "6px",
              background: mode === "phone" ? COLORS.green : "transparent",
              color: mode === "phone" ? "#fff" : COLORS.textMuted,
              fontWeight: 700, cursor: "pointer"
            }}
          >Phone OTP</button>
        </div>

        {mode === "email" && (
          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: "18px" }}>
              <label htmlFor="email" style={{ display: "block", fontWeight: 600, color: "#263648" }}>
                Email address
              </label>
              <input
                id="email" type="email" autoComplete="email"
                placeholder="you@example.com" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="password" style={{ display: "block", fontWeight: 600, color: "#263648" }}>
                Password
              </label>
              <input
                id="password" type="password" autoComplete="current-password"
                placeholder="Enter your password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: "12px",
              marginBottom: "20px", fontSize: "14px"
            }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#475569" }}>
                <input type="checkbox" name="rememberMe" /> Remember me
              </label>
              <a href="/forgot-password" style={{ color: COLORS.blue, textDecoration: "none", fontWeight: 600 }}>
                Forgot password?
              </a>
            </div>
            <button type="submit" disabled={loading} style={buttonStyle(COLORS.blue)}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {mode === "phone" && (
          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="phone" style={{ display: "block", fontWeight: 600, color: "#263648" }}>
                Phone number
              </label>
              <input
                id="phone" type="tel" autoComplete="tel"
                placeholder="+26658000001" required disabled={otpSent}
                value={phone} onChange={(e) => setPhone(e.target.value)}
                style={fieldStyle}
              />
            </div>
            {otpSent && (
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="otp" style={{ display: "block", fontWeight: 600, color: "#263648" }}>
                  Enter OTP
                </label>
                <input
                  id="otp" type="text" inputMode="numeric"
                  autoComplete="one-time-code" placeholder="123456"
                  required value={otp} onChange={(e) => setOtp(e.target.value)}
                  style={fieldStyle}
                />
              </div>
            )}
            <button type="submit" disabled={loading} style={buttonStyle(COLORS.green)}>
              {loading ? "Please wait..." : otpSent ? "Verify OTP & Sign in" : "Send OTP"}
            </button>
            {otpSent && (
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(""); setInfo(""); }}
                style={{
                  ...buttonStyle("transparent"),
                  color: COLORS.blue, border: `1px solid ${COLORS.blue}`
                }}
              >Use different number</button>
            )}
          </form>
        )}

        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          margin: "22px 0", color: COLORS.textMuted, fontSize: "13px"
        }}>
          <div style={{ flex: 1, height: "1px", background: COLORS.border }} />
          <span>OR</span>
          <div style={{ flex: 1, height: "1px", background: COLORS.border }} />
        </div>

        <button
          type="button" onClick={handleGoogleLogin} disabled={loading}
          style={{
            width: "100%", padding: "12px",
            border: `1px solid ${COLORS.border}`, borderRadius: "6px",
            background: "#fff", color: "#333", fontSize: "15px",
            fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.8-5.3l-6.4-5.4C29.3 34.9 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.4 5.4C36.9 39.1 44 34 44 24c0-1.3-.1-2.5-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>

        {error && (
          <p role="alert" style={{ margin: "16px 0 0", color: COLORS.error, fontSize: "14px", textAlign: "center" }}>
            {error}
          </p>
        )}
        {info && !error && (
          <p style={{ margin: "16px 0 0", color: COLORS.green, fontSize: "14px", textAlign: "center" }}>
            {info}
          </p>
        )}

        <p style={{ margin: "24px 0 0", color: COLORS.textMuted, textAlign: "center", fontSize: "14px" }}>
          Don&apos;t have an account?{" "}
          <Link to="/register" state={location.state} style={{ color: COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

function prettyError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Incorrect email or password.";
  if (code.includes("user-not-found")) return "No account found with that email.";
  if (code.includes("too-many-requests")) return "Too many attempts. Try again later.";
  if (code.includes("popup-closed-by-user")) return "Google sign-in cancelled.";
  if (code.includes("invalid-phone-number")) return "Invalid phone number format.";
  if (code.includes("invalid-verification-code")) return "Invalid OTP code.";
  return err?.message || "Something went wrong. Please try again.";
}

export default Login;
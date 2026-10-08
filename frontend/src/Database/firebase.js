// ============================================================
// FIREBASE SETUP (DEBUG VERSION)
// ============================================================
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBN1MUfSvpSOI5H-3X6V-zla3eGJHhO4kQ",
  authDomain: "lesotho-gov-services.firebaseapp.com",
  projectId: "lesotho-gov-services",
  storageBucket: "lesotho-gov-services.firebasestorage.app",
  messagingSenderId: "444172769972",
  appId: "1:444172769972:web:f810ef4da2f31f264515e1"
};

// 🔍 DEBUG: Print what Firebase sees
console.log("🔥 Firebase config loaded:", {
  apiKey: firebaseConfig.apiKey.slice(0, 10) + "..." + firebaseConfig.apiKey.slice(-5),
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Log auth state changes for debugging
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("🔥 Auth: signed in as", user.uid);
  } else {
    console.log("🔥 Auth: signed out");
  }
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";
export const API_BASE = "http://localhost:3001/api";

export default app;
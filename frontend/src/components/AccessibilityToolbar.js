import { useCallback, useEffect, useRef, useState } from "react";
import "./AccessibilityToolbar.css";
import { setDarkMode } from "./theme";

const MIN_ZOOM = 1;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
const ZOOM_STORAGE_KEY = "home-affairs-accessibility-zoom";
const CONTRAST_STORAGE_KEY = "home-affairs-high-contrast";

const sesothoFieldLabels = {
  "address": "Aterese",
  "confirm password": "Netefatsa phasewete",
  "date of birth": "Letsatsi la tsoalo",
  "description": "Tlhaloso",
  "email": "Imeile",
  "email address": "Aterese ea imeile",
  "enquiry type": "Mofuta oa potso",
  "first name": "Lebitso la pele",
  "full name": "Lebitso le felletseng",
  "last name": "Fane",
  "national id number": "Nomoro ea boitsebiso",
  "password": "Phasewete",
  "phone": "Mohala",
  "phone number": "Nomoro ea mohala",
  "search": "Batla",
  "subject": "Sehlooho"
};

function readZoom() {
  const savedZoom = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
  return Number.isFinite(savedZoom)
    ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, savedZoom))
    : MIN_ZOOM;
}

function isReadableField(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLTextAreaElement) return true;
  if (!(element instanceof HTMLInputElement)) return false;
  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]
    .includes(element.type);
}

function getFieldText(field, language) {
  const label = Array.from(field.labels || [])
    .map(item => item.innerText || item.textContent)
    .join(" ")
    .trim() || field.getAttribute("aria-label") || field.placeholder || "Text field";
  const normalizedLabel = label.toLowerCase().replace(/[:*]/g, "").trim();
  const spokenLabel = language === "st-LS"
    ? sesothoFieldLabels[normalizedLabel] || label
    : label;
  const descriptions = (field.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.innerText || "")
    .filter(Boolean);
  return [spokenLabel, ...descriptions].join(". ");
}

function getPageInstructions() {
  const content = document.querySelector(
    "main, [role='main'], .dashboard-page, .home-dashboard-page, .auth-page, .help-page"
  ) || document.body;
  const text = Array.from(content.querySelectorAll("h1, h2, h3, p, label, legend"))
    .filter(element => element.getClientRects().length > 0)
    .map(element => element.innerText || element.textContent || "")
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 6000);
}

export default function AccessibilityToolbar() {
  const [zoom, setZoom] = useState(readZoom);
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem(CONTRAST_STORAGE_KEY) === "true"
  );
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("home-affairs-theme") === "dark"
  );
  const [language, setLanguage] = useState("en-LS");
  const [activeField, setActiveField] = useState(null);
  const [speakerPosition, setSpeakerPosition] = useState(null);
  const [speechStatus, setSpeechStatus] = useState("");
  const [activeSpeech, setActiveSpeech] = useState(null);
  const speakerRef = useRef(null);
  const activeFieldRef = useRef(null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.zoom = String(zoom);
    localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    if (highContrast) {
      document.body.dataset.contrast = "high";
    } else {
      delete document.body.dataset.contrast;
    }
    localStorage.setItem(CONTRAST_STORAGE_KEY, String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    if (localStorage.getItem("home-affairs-theme") === "dark") {
      document.body.dataset.theme = "dark";
    } else {
      delete document.body.dataset.theme;
    }
  }, []);

  useEffect(() => {
    const syncTheme = event => {
      const nextDarkMode = event.detail?.isDarkMode ??
        localStorage.getItem("home-affairs-theme") === "dark";
      setIsDarkMode(nextDarkMode);
    };
    window.addEventListener("home-affairs-theme-change", syncTheme);
    return () => window.removeEventListener("home-affairs-theme-change", syncTheme);
  }, []);

  const updateSpeakerPosition = useCallback(() => {
    const field = activeFieldRef.current;
    if (!field || !field.isConnected) return;
    const rect = field.getBoundingClientRect();
    const buttonSize = 42;
    const left = rect.right + buttonSize + 8 <= window.innerWidth
      ? rect.right + 8
      : Math.max(8, rect.left - buttonSize - 8);
    setSpeakerPosition({
      left,
      top: Math.min(
        window.innerHeight - buttonSize - 8,
        Math.max(8, rect.top + (rect.height - buttonSize) / 2)
      )
    });
  }, []);

  useEffect(() => {
    const handleFocusIn = event => {
      if (event.target === speakerRef.current) return;
      if (isReadableField(event.target)) {
        activeFieldRef.current = event.target;
        setActiveField(event.target);
        updateSpeakerPosition();
      } else if (!event.target.closest?.(".accessibility-toolbar")) {
        activeFieldRef.current = null;
        setActiveField(null);
        setSpeakerPosition(null);
      }
    };

    const handleFocusOut = event => {
      if (
        isReadableField(event.target) &&
        !event.relatedTarget?.closest?.(".accessibility-toolbar") &&
        event.relatedTarget !== speakerRef.current
      ) {
        activeFieldRef.current = null;
        setActiveField(null);
        setSpeakerPosition(null);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", updateSpeakerPosition);
    window.addEventListener("scroll", updateSpeakerPosition, true);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", updateSpeakerPosition);
      window.removeEventListener("scroll", updateSpeakerPosition, true);
    };
  }, [updateSpeakerPosition]);

  const stopReading = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setActiveSpeech(null);
    setSpeechStatus("");
  }, []);

  const speak = useCallback((text, kind) => {
    if (!text) {
      setSpeechStatus("There is no page text to read.");
      return;
    }
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      setSpeechStatus("Text-to-speech is not supported by this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = language;
    const voice = window.speechSynthesis.getVoices().find(item =>
      item.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase())
    );
    if (voice) utterance.voice = voice;
    utteranceRef.current = utterance;
    setActiveSpeech(kind);
    utterance.onstart = () => setSpeechStatus("");
    utterance.onerror = event => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setActiveSpeech(null);
        setSpeechStatus(`Unable to read text aloud: ${event.error}.`);
      }
    };
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setActiveSpeech(null);
        setSpeechStatus("");
      }
    };
    setSpeechStatus("");
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const adjustZoom = amount => {
    setZoom(current => Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.round((current + amount) * 10) / 10)
    ));
  };

  const toggleHighContrast = () => setHighContrast(current => !current);
  const toggleDarkMode = () => {
    const nextDarkMode = !isDarkMode;
    setDarkMode(nextDarkMode);
    setIsDarkMode(nextDarkMode);
  };
  const readActiveField = () => {
    if (activeFieldRef.current) {
      speak(getFieldText(activeFieldRef.current, language), "field");
    }
  };

  return (
    <>
      <section
        className="accessibility-toolbar"
        aria-label="Accessibility controls"
      >
        <div className="accessibility-toolbar-controls">
          <span className="accessibility-toolbar-label">Accessibility</span>
          <button
            type="button"
            className="accessibility-control"
            aria-label="Decrease text size"
            onClick={() => adjustZoom(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
          >
            <svg className="accessibility-control-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 5 5M7.5 10.5h6" />
            </svg>
            <span>A-</span>
          </button>
          <span className="accessibility-zoom-level" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="accessibility-control"
            aria-label="Increase text size"
            onClick={() => adjustZoom(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
          >
            <svg className="accessibility-control-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 5 5M7.5 10.5h6m-3-3v6" />
            </svg>
            <span>A+</span>
          </button>
          <button
            type="button"
            className="accessibility-control accessibility-contrast-toggle"
            aria-pressed={highContrast}
            onClick={toggleHighContrast}
          >
            <svg className="accessibility-control-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v18a9 9 0 0 0 0-18Z" />
            </svg>
            {highContrast ? "High contrast on" : "High contrast"}
          </button>
          <button
            type="button"
            className="accessibility-control accessibility-theme-toggle"
            aria-label={isDarkMode ? "Turn light mode on" : "Turn dark mode on"}
            aria-pressed={isDarkMode}
            onClick={toggleDarkMode}
          >
            <svg
              className="accessibility-theme-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {isDarkMode ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </>
              ) : (
                <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
              )}
            </svg>
            {isDarkMode ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            className="accessibility-control accessibility-read-page"
            aria-label={activeSpeech === "page" ? "Stop reading" : "Read page instructions"}
            onClick={() => activeSpeech === "page"
              ? stopReading()
              : speak(getPageInstructions(), "page")}
          >
            {activeSpeech === "page"
              ? "Stop reading"
              : (
                <>
                  <svg className="accessibility-speaker-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" />
                  </svg>
                  Read page instructions
                </>
              )}
          </button>
          <label className="accessibility-language-label" htmlFor="accessibility-voice-language">
            Translate
          </label>
          <select
            id="accessibility-voice-language"
            className="accessibility-language-select"
            value={language}
            onChange={event => setLanguage(event.target.value)}
          >
            <option value="en-LS">English</option>
            <option value="st-LS">Sesotho</option>
          </select>
          {activeField && (
            <button
              type="button"
              className="accessibility-control accessibility-read-focused"
              onClick={readActiveField}
              onPointerDown={event => event.preventDefault()}
              aria-label="Read the focused field aloud"
            >
              Read focused field
            </button>
          )}
        </div>
        <span className="accessibility-speech-status" role="status" aria-live="polite">
          {speechStatus}
        </span>
      </section>
      {activeField && speakerPosition && (
        <button
          ref={speakerRef}
          type="button"
          className="accessibility-field-speaker"
          aria-label={`Read ${getFieldText(activeField, language)} aloud`}
          title="Read this field aloud"
          style={{
            left: `${speakerPosition.left}px`,
            top: `${speakerPosition.top}px`
          }}
          onPointerDown={event => event.preventDefault()}
          onClick={readActiveField}
        >
          <svg className="accessibility-speaker-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" />
          </svg>
        </button>
      )}
    </>
  );
}

import React, { useState } from "react";
import { COLORS } from "../styles/dashboardStyles";

export default function CollectionCentreReferral({ department }) {
  const [mapUrl, setMapUrl] = useState("");
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);

  function findNearbyCentres() {
    setMessage("");
    setMapUrl("");
    if (!navigator.geolocation) {
      setMessage("Location is unavailable in this browser. Enable location services or contact the department for collection guidance.");
      return;
    }

    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const query = encodeURIComponent(
          `${department} document collection centre near ${coords.latitude},${coords.longitude} Lesotho`
        );
        setMapUrl(`https://www.google.com/maps/search/?api=1&query=${query}`);
        setSearching(false);
      },
      () => {
        setMessage("Location access was not granted. Enable it or contact the department for collection guidance.");
        setSearching(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div style={{
      marginTop: 16, padding: 14, background: COLORS.blueLight,
      border: `1px solid ${COLORS.border}`, borderRadius: 8
    }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: COLORS.textDark, fontWeight: 600 }}>
        This document must be collected in person. Use your location to find nearby {department} collection centres.
      </p>
      <button type="button" onClick={findNearbyCentres} disabled={searching} style={{
        padding: "9px 12px", border: 0, borderRadius: 6,
        background: COLORS.blue, color: "#fff", cursor: searching ? "wait" : "pointer",
        fontWeight: 700, fontSize: 12, fontFamily: "inherit"
      }}>
        {searching ? "Finding location…" : "Find a nearby collection centre"}
      </button>
      {message && <p role="status" style={{ margin: "10px 0 0", fontSize: 12, color: COLORS.textMid }}>{message}</p>}
      {mapUrl && (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: COLORS.textMid }}>
          <a href={mapUrl} target="_blank" rel="noreferrer" style={{ color: COLORS.blue, fontWeight: 700 }}>
            View nearby centres in Google Maps
          </a>
          <br />Confirm the centre provides this service before travelling. Your location is not saved by this page.
        </p>
      )}
    </div>
  );
}

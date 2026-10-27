import { useState } from "react";
import { COLORS } from "../styles/dashboardStyles";

export const COLLECTION_CENTRES = [
  { district: "Berea", capital: "Teyateyaneng" },
  { district: "Butha-Buthe", capital: "Butha-Buthe" },
  { district: "Leribe", capital: "Hlotse" },
  { district: "Mafeteng", capital: "Mafeteng" },
  { district: "Maseru", capital: "Maseru" },
  { district: "Mohale's Hoek", capital: "Mohale's Hoek" },
  { district: "Mokhotlong", capital: "Mokhotlong" },
  { district: "Qacha's Nek", capital: "Qacha's Nek" },
  { district: "Quthing", capital: "Moyeni" },
  { district: "Thaba-Tseka", capital: "Thaba-Tseka" }
];

export default function CollectionCentreReferral({ department, itemType = "document" }) {
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const selectedCentre = COLLECTION_CENTRES.find(({ district }) => district === selectedDistrict);

  return (
    <div style={{
      marginTop: 16, padding: 14, background: COLORS.blueLight,
      border: `1px solid ${COLORS.border}`, borderRadius: 8
    }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: COLORS.textDark, fontWeight: 600 }}>
        Select your district to see where to collect your {department} {itemType}.
      </p>
      <label style={{ display: "block", marginBottom: 6, color: COLORS.textDark, fontSize: 13, fontWeight: 600 }}>
        Collection district
      </label>
      <select
        value={selectedDistrict}
        onChange={event => setSelectedDistrict(event.target.value)}
        style={{
          width: "100%", maxWidth: 360, padding: "9px 10px",
          border: `1px solid ${COLORS.border}`, borderRadius: 6,
          background: COLORS.white, color: COLORS.textDark, font: "inherit"
        }}
      >
        <option value="">Choose your district</option>
        {COLLECTION_CENTRES.map(({ district }) => (
          <option key={district} value={district}>{district}</option>
        ))}
      </select>
      {selectedCentre && (
        <p role="status" style={{ margin: "10px 0 0", color: COLORS.textDark, fontSize: 13, fontWeight: 600 }}>
          Your {itemType} is ready for collection at {selectedCentre.capital}.
        </p>
      )}
    </div>
  );
}

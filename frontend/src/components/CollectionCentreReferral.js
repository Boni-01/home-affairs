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

export default function CollectionCentreReferral({ department }) {
  return (
    <div style={{
      marginTop: 16, padding: 14, background: COLORS.blueLight,
      border: `1px solid ${COLORS.border}`, borderRadius: 8
    }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: COLORS.textDark, fontWeight: 600 }}>
        Collect approved {department} documents in person at the capital of your district. Collection centres are:
      </p>
      <ul style={{ margin: 0, paddingLeft: 20, color: COLORS.textDark, fontSize: 13, lineHeight: 1.6 }}>
        {COLLECTION_CENTRES.map(({ district, capital }) => (
          <li key={district}><strong>{district}</strong> — {capital}</li>
        ))}
      </ul>
    </div>
  );
}

import { useState } from "react";

function PensionsDashboard() {
  const [idNumber, setIdNumber] = useState("");
  const [message, setMessage] = useState("");
  const services = [
    ["Pension applications", "Apply for eligible pension benefits and follow up on an application."],
    ["Payments and payment history", "Ask about payment dates, missing or delayed payments, and payment history."],
    ["Benefit statements and calculations", "Request a pension statement, benefit amount breakdown, or income confirmation."],
    ["Bank and contact details", "Request updates to contact information or the bank account used for payments."],
    ["Life certificates", "Submit or follow up on a life certificate required to maintain payments."],
    ["Survivor and dependant benefits", "Enquire about or follow up on eligible survivor and dependant claims."],
    ["Funeral benefits", "Check eligibility and follow up on funeral assistance claims, where offered."],
    ["Deductions and tax documents", "Ask about benefit deductions and request available tax or payment documents."],
    ["Appeals, complaints, and corrections", "Dispute a decision, report a problem, or request a correction to your record."],
    ["Pensioner verification", "Request available proof of pensioner status or benefit documentation."],
  ];
  

  function handleTrack(event) {
    event.preventDefault();
    setMessage(
      idNumber.trim()
        ? "Your ID number is ready for a pension-record lookup. Live application and payment status requires connection to the pension office records system."
        : "Enter your ID number to track a pension service."
    );
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <header>
        <h1>Pensions and Finance Services</h1>
        <p>Access pension-office services and use your ID number to track applications, claims, and payment enquiries.</p>
      </header>

      <section aria-labelledby="tracking-heading" style={{ margin: "24px 0 32px", padding: 20, border: "1px solid #d5dce5", borderRadius: 8 }}>
        <h2 id="tracking-heading">Track a pension service</h2>
        <form onSubmit={handleTrack}>
          <label htmlFor="pension-id">ID number</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            <input
              id="pension-id"
              name="idNumber"
              type="text"
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
              autoComplete="off"
              required
              style={{ flex: "1 1 240px", padding: 10, border: "1px solid #8995a5", borderRadius: 4 }}
            />
            <button type="submit" style={{ padding: "10px 18px", cursor: "pointer" }}>Track request</button>
          </div>
        </form>
        {message && <p role="status" aria-live="polite">{message}</p>}
      </section>

      <section aria-labelledby="services-heading">
        <h2 id="services-heading">Pension office services</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
          {services.map(([title, description]) => (
            <article key={title} style={{ padding: 18, border: "1px solid #d5dce5", borderRadius: 8 }}>
              <h3>{title}</h3>
              <p>{description}</p>
              <p><strong>Tracking:</strong> Use your ID number above to follow up.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default PensionsDashboard;
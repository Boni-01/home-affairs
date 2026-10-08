function PoliceDashboard() {
  const services = [
    {
      icon: "📝",
      title: "Crime reports",
      description: "Report theft, assault, fraud, burglary, and other incidents, or ask how to follow up on a case.",
      detail: "Share when and where it happened, what was involved, and any available evidence or witness details. Ask for a reference number and how to receive updates.",
    },
    {
      icon: "🚨",
      title: "Emergency assistance",
      description: "For an immediate threat or urgent danger, contact your local emergency number or police station by phone.",
      detail: "Give your location first, describe the immediate risk, and follow the operator's instructions. Do not use this information page to request urgent help.",
    },
    {
      icon: "🤝",
      title: "Domestic violence support",
      description: "Seek help, safety guidance, and information about protection and referral services.",
      detail: "Ask to speak privately with an officer about reporting options, safety planning, protection processes, and local support organisations. In immediate danger, call emergency services.",
    },
    {
      icon: "🚗",
      title: "Traffic incidents",
      description: "Report road accidents and other traffic-related incidents, and ask about the reporting process.",
      detail: "Be ready to provide the location and time, vehicles involved, and whether anyone is injured. Ask what forms, photographs, or insurance-related documents are required.",
    },
    {
      icon: "🪪",
      title: "Clearance and fingerprints",
      description: "Enquire about police clearance checks, fingerprinting, appointments, and required documents.",
      detail: "Confirm eligibility, fees, appointment requirements, processing times, and accepted identification before visiting. Requirements vary by service and location.",
    },
    {
      icon: "🔎",
      title: "Lost and found property",
      description: "Report lost property or find out how to claim an item recovered by the police.",
      detail: "Describe the item and where it was lost or found. For a claim, ask what proof of ownership and identification to bring, and whether a report or reference number is needed.",
    },
    {
      icon: "🧭",
      title: "Missing persons",
      description: "Report a missing person or provide information that could help locate someone.",
      detail: "Provide a recent photograph, a clear description, last known location and time, and any relevant circumstances. Contact police promptly; you do not need to wait a set period to report someone missing.",
    },
    {
      icon: "💬",
      title: "Victim and witness support",
      description: "Ask about giving a statement, available support, and referrals to community services.",
      detail: "Ask how to arrange a statement, what to expect during the process, and whether interpretation, accessibility, or a support person can be arranged.",
    },
    {
      icon: "🏘️",
      title: "Community safety",
      description: "Get information about crime prevention, neighbourhood initiatives, and community policing.",
      detail: "Ask about local meetings, neighbourhood watch guidance, prevention resources, and the appropriate way to share non-urgent community concerns.",
    },
    {
      icon: "📄",
      title: "Documents and enquiries",
      description: "Check station procedures, case-related enquiries, and which documents to bring for a service.",
      detail: "When enquiring about a case, have its reference number and relevant dates available. Confirm office hours, appointment needs, identification, and document requirements in advance.",
    },
  ];

  const styles = {
    page: {
      minHeight: "100vh",
      padding: "40px 24px",
      background: "#f4f7fb",
      color: "#17243a",
      fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    container: { maxWidth: 1120, margin: "0 auto" },
    hero: {
      padding: "36px 40px",
      borderRadius: 18,
      color: "#fff",
      background: "linear-gradient(120deg, #123b70, #176b8a)",
      boxShadow: "0 12px 30px rgba(18, 59, 112, 0.14)",
    },
    eyebrow: { margin: "0 0 10px", color: "#b9e7f2", fontSize: 13, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" },
    title: { margin: 0, fontSize: "clamp(30px, 5vw, 42px)", lineHeight: 1.15 },
    intro: { maxWidth: 700, margin: "12px 0 0", color: "#e1edf5", fontSize: 16, lineHeight: 1.6 },
    alert: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      margin: "22px 0 34px",
      padding: "16px 18px",
      border: "1px solid #f0d28b",
      borderRadius: 12,
      background: "#fff9e9",
      color: "#654b12",
      lineHeight: 1.5,
    },
    heading: { margin: "0 0 6px", fontSize: 23 },
    sectionIntro: { margin: "0 0 20px", color: "#5e6c80", lineHeight: 1.5 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))", gap: 16 },
    card: {
      minHeight: 150,
      padding: 20,
      border: "1px solid #e3eaf2",
      borderRadius: 14,
      background: "#fff",
      boxShadow: "0 4px 14px rgba(25, 49, 80, 0.04)",
    },
    icon: { fontSize: 23 },
    cardTitle: { margin: "12px 0 7px", fontSize: 17 },
    cardText: { margin: 0, color: "#5e6c80", fontSize: 14, lineHeight: 1.55 },
    cardDetail: { margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid #edf1f5", color: "#40536b", fontSize: 13, lineHeight: 1.55 },
    footer: { marginTop: 26, color: "#68778b", fontSize: 13, lineHeight: 1.5 },
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.hero}>
          <p style={styles.eyebrow}>Community safety · Public services</p>
          <h1 style={styles.title}>Police Station Services</h1>
          <p style={styles.intro}>
            Find common services and support available through your local police station.
            Contact the station to confirm availability, hours, and what to bring.
          </p>
        </header>

        <aside style={styles.alert} role="note">
          <span aria-hidden="true">⚠️</span>
          <span><strong>Immediate danger?</strong> Call your local emergency number. This page provides service information and is not an emergency reporting channel.</span>
        </aside>

        <section aria-labelledby="services-heading">
          <h2 id="services-heading" style={styles.heading}>How the station can help</h2>
          <p style={styles.sectionIntro}>Review the guidance below, then contact your local station to confirm the right process and any location-specific requirements.</p>
          <div style={styles.grid}>
            {services.map((service) => (
              <article key={service.title} style={styles.card}>
                <span style={styles.icon} aria-hidden="true">{service.icon}</span>
                <h3 style={styles.cardTitle}>{service.title}</h3>
                <p style={styles.cardText}>{service.description}</p>
                <p style={styles.cardDetail}>{service.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <p style={styles.footer}>
          Services and procedures vary by location. Contact your local station to confirm what is offered and any requirements before visiting.
        </p>
      </div>
    </main>
  );
}

export default PoliceDashboard;
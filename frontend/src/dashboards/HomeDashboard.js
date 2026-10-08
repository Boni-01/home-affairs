
function HomeDashboard() {
  const dashboards = [
    {
      title: "Applications",
      description: "Start an application or track one you have already submitted.",
      href: "/dashboard/applications",
      icon: "📄",
    },
    {
      title: "Appointments",
      description: "Book or review appointments for Home Affairs services.",
      href: "/dashboard/appointments",
      icon: "📅",
    },
    {
      title: "Documents",
      description: "View documents and supporting information for your applications.",
      href: "/dashboard/documents",
      icon: "🗂️",
    },
    {
      title: "Payments",
      description: "Review fees and payment information for your services.",
      href: "/dashboard/payments",
      icon: "💳",
    },
    {
      title: "My Profile",
      description: "View and update your personal and contact information.",
      href: "/dashboard/profile",
      icon: "👤",
    },
  ];

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <p style={{ margin: "0 0 0.5rem", color: "#526174" }}>Home Affairs</p>
        <h1 style={{ margin: "0 0 0.75rem" }}>Home Dashboard</h1>
        <p style={{ margin: 0, color: "#526174" }}>
          Select a dashboard to manage your services and account.
        </p>
      </header>

      <section
        aria-label="Dashboards"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {dashboards.map(({ title, description, href, icon }) => (
          <a
            key={title}
            href={href}
            style={{
              display: "block",
              padding: "1.25rem",
              border: "1px solid #d8dee8",
              borderRadius: "10px",
              backgroundColor: "#fff",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>{icon}</span>
            <h2 style={{ margin: "0.75rem 0 0.5rem", fontSize: "1.15rem" }}>{title}</h2>
            <p style={{ margin: 0, lineHeight: 1.5, color: "#526174" }}>{description}</p>
          </a>
        ))}
      </section>
    </main>
  );
}

export default HomeDashboard;
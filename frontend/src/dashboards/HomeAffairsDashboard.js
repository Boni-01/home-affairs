function HomeAffairsDashboard() {
  const services = [
    { name: "Birth certificates", count: "1,284", detail: "Applications this month", color: "blue", icon: "BC" },
    { name: "Identity documents", count: "936", detail: "Applications this month", color: "violet", icon: "ID" },
    { name: "Passports", count: "512", detail: "Applications this month", color: "green", icon: "PA" },
    { name: "Marriage certificates", count: "248", detail: "Applications this month", color: "orange", icon: "MC" },
    { name: "Death certificates", count: "184", detail: "Applications this month", color: "blue", icon: "DC" },
  ];

  const applications = [
    { reference: "HA-08421", service: "Birth certificate", applicant: "Mpho Kgosana", submitted: "Today, 09:42", status: "Ready for collection", state: "ready" },
    { reference: "HA-08417", service: "Smart ID", applicant: "Naledi Mokoena", submitted: "Today, 09:18", status: "Under review", state: "review" },
    { reference: "HA-08396", service: "Passport renewal", applicant: "Thabo Molefe", submitted: "Yesterday, 15:36", status: "Processing", state: "processing" },
    { reference: "HA-08382", service: "Marriage certificate", applicant: "Lerato Dube", submitted: "Yesterday, 14:05", status: "Completed", state: "complete" },
  ];

  return (
    <main className="ha-dashboard">
      <style>{`
        .ha-dashboard { min-height: 100vh; padding: 32px; background: #f5f7fb; color: #1d2a3f; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .ha-container { max-width: 1200px; margin: 0 auto; }
        .ha-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 34px; }
        .ha-brand { display: flex; align-items: center; gap: 12px; }
        .ha-logo { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 11px; background: #194477; color: white; font-size: 14px; font-weight: 800; }
        .ha-brand strong { display: block; font-size: 14px; }
        .ha-brand small { display: block; margin-top: 3px; color: #7b8798; font-size: 12px; }
        .ha-admin { display: flex; align-items: center; gap: 10px; color: #59667b; font-size: 13px; }
        .ha-avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: #e4ebf5; color: #244d7b; font-weight: 700; }
        .ha-title-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 23px; }
        .ha-title-row h1 { margin: 0; font-size: 30px; letter-spacing: -.7px; }
        .ha-title-row p { margin: 7px 0 0; color: #7b8798; font-size: 14px; }
        .ha-date { color: #7b8798; font-size: 13px; }
        .ha-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .ha-card { border: 1px solid #e8edf4; border-radius: 13px; background: white; box-shadow: 0 3px 12px rgba(28, 48, 77, .035); }
        .ha-metric { padding: 18px 20px; }
        .ha-metric-top { display: flex; justify-content: space-between; align-items: center; color: #718096; font-size: 13px; }
        .ha-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; font-size: 10px; font-weight: 750; }
        .ha-icon.blue { background: #eaf2fd; color: #3974bd; }
        .ha-icon.violet { background: #f0edfc; color: #7059b8; }
        .ha-icon.green { background: #e8f6ef; color: #27865f; }
        .ha-icon.orange { background: #fff3e2; color: #b87920; }
        .ha-count { margin: 12px 0 4px; color: #1d2a3f; font-size: 27px; font-weight: 750; letter-spacing: -.5px; }
        .ha-detail { color: #8a95a5; font-size: 12px; }
        .ha-lower { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(260px, .85fr); gap: 18px; margin-top: 19px; }
        .ha-panel { padding: 20px; }
        .ha-panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; }
        .ha-panel h2 { margin: 0; font-size: 16px; }
        .ha-subtitle { margin: 5px 0 0; color: #8994a4; font-size: 12px; }
        .ha-table-wrap { overflow-x: auto; }
        .ha-table { width: 100%; border-collapse: collapse; text-align: left; }
        .ha-table th { padding: 0 12px 11px 0; color: #8994a4; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; white-space: nowrap; }
        .ha-table td { padding: 13px 12px 13px 0; border-top: 1px solid #eff2f6; color: #59667b; font-size: 12px; white-space: nowrap; }
        .ha-table td:first-child { color: #293950; font-weight: 650; }
        .ha-status { display: inline-block; padding: 5px 8px; border-radius: 20px; font-size: 10px; font-weight: 650; }
        .ha-status.ready { background: #e8f6ef; color: #247c57; }
        .ha-status.review { background: #fff4df; color: #9b711d; }
        .ha-status.processing { background: #eaf2fd; color: #376da9; }
        .ha-status.complete { background: #f0edfc; color: #6651aa; }
        .ha-action-list { display: grid; gap: 10px; }
        .ha-action { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #edf0f5; border-radius: 10px; background: white; color: #293950; text-align: left; font: inherit; cursor: pointer; }
        .ha-action:hover { border-color: #c7d7eb; background: #f9fbff; }
        .ha-action-icon { display: grid; flex: 0 0 34px; place-items: center; width: 34px; height: 34px; border-radius: 9px; background: #edf4fc; color: #326ba9; font-size: 18px; }
        .ha-action strong { display: block; font-size: 12px; }
        .ha-action small { display: block; margin-top: 3px; color: #8994a4; font-size: 11px; }
        .ha-notice { margin-top: 16px; padding: 13px; border: 1px solid #dce8f6; border-radius: 10px; background: #f4f8fe; }
        .ha-notice strong { color: #315d8b; font-size: 12px; }
        .ha-notice p { margin: 5px 0 0; color: #708097; font-size: 11px; line-height: 1.5; }
        @media (max-width: 900px) { .ha-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ha-lower { grid-template-columns: 1fr; } }
        @media (max-width: 560px) { .ha-dashboard { padding: 20px 14px; } .ha-header { margin-bottom: 26px; } .ha-brand small, .ha-admin > span { display: none; } .ha-title-row { align-items: flex-start; flex-direction: column; } .ha-title-row h1 { font-size: 26px; } .ha-grid { gap: 10px; } .ha-metric { padding: 14px; } .ha-count { font-size: 24px; } .ha-panel { padding: 15px; } }
      `}</style>

      <div className="ha-container">
        <header className="ha-header">
          <div className="ha-brand">
            <div className="ha-logo" aria-hidden="true">HA</div>
            <div><strong>Department of Home Affairs</strong><small>Service operations portal</small></div>
          </div>
          <div className="ha-admin"><span>Administrator</span><div className="ha-avatar" aria-label="Administrator">AD</div></div>
        </header>

        <section className="ha-title-row">
          <div><h1>Dashboard</h1><p>Monitor certificate services and application activity.</p></div>
          <div className="ha-date">Operations overview · Today</div>
        </section>

        <section className="ha-grid" aria-label="Certificate applications this month">
          {services.map((service) => (
            <article className="ha-card ha-metric" key={service.name}>
              <div className="ha-metric-top"><span>{service.name}</span><span className={`ha-icon ${service.color}`} aria-hidden="true">{service.icon}</span></div>
              <div className="ha-count">{service.count}</div>
              <div className="ha-detail">{service.detail}</div>
            </article>
          ))}
        </section>

        <section className="ha-lower">
          <article className="ha-card ha-panel">
            <div className="ha-panel-head"><div><h2>Recent applications</h2><p className="ha-subtitle">Latest updates across Home Affairs services</p></div></div>
            <div className="ha-table-wrap">
              <table className="ha-table">
                <thead><tr><th>Reference</th><th>Service</th><th>Applicant</th><th>Submitted</th><th>Status</th></tr></thead>
                <tbody>{applications.map((application) => (
                  <tr key={application.reference}>
                    <td>{application.reference}</td><td>{application.service}</td><td>{application.applicant}</td><td>{application.submitted}</td>
                    <td><span className={`ha-status ${application.state}`}>{application.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </article>

          <aside className="ha-card ha-panel">
            <div className="ha-panel-head"><div><h2>Quick actions</h2><p className="ha-subtitle">Common service tasks</p></div></div>
            <div className="ha-action-list">
              <button className="ha-action" type="button"><span className="ha-action-icon" aria-hidden="true">＋</span><span><strong>Register a certificate</strong><small>Create a certificate record</small></span></button>
              <button className="ha-action" type="button"><span className="ha-action-icon" aria-hidden="true">⌕</span><span><strong>Find an application</strong><small>Search by reference or applicant</small></span></button>
              <button className="ha-action" type="button"><span className="ha-action-icon" aria-hidden="true">▦</span><span><strong>View service records</strong><small>Review department activity</small></span></button>
            </div>
            <div className="ha-notice"><strong>Services operational</strong><p>Certificate and identity services are currently available.</p></div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default HomeAffairsDashboard;
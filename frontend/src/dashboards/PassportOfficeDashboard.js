function PassportOfficeDashboard() {
  const services = [
    'Passport application',
    'Passport renewal',
    'Passport replacement',
    'Visa application',
    'Visa renewal',
    'Travel document services',
    'Identity verification',
    'Document collection and status checks'
  ];

  const notifications = [
    { title: 'Queue Update', message: 'Passport verification counters 2 and 4 are now open.', time: '2 min ago', priority: 'High' },
    { title: 'Document Review', message: 'Two applications require additional identity checks.', time: '9 min ago', priority: 'Medium' },
    { title: 'System Notice', message: 'Biometric capture station is operating normally.', time: '15 min ago', priority: 'Low' }
  ];

  return (
    <main style={{ padding: '2rem', background: '#f3f6fb', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#1f2937' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: '#ffffff', borderRadius: '16px', padding: '1.5rem 2rem', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4b5563' }}>Operations</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: '2rem' }}>Passport Office Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#e0f2fe', padding: '0.7rem 1rem', borderRadius: '999px', color: '#075985', fontWeight: 700 }}>
            <span style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 0 4px rgba(34,197,94,0.15)' }}></span>
            Live operations
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem 1.75rem', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Services Offered</h2>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700 }}>8 services</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.8rem' }}>
              {services.map((service) => (
                <div key={service} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem 1rem', fontWeight: 600, color: '#334155' }}>
                  {service}
                </div>
              ))}
            </div>
          </div>

          <aside style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem 1.75rem', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Live Notifications</h2>
              <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 0 5px rgba(239,68,68,0.12)' }}></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {notifications.map((notification) => (
                <div key={notification.title} style={{ background: '#f8fafc', borderLeft: notification.priority === 'High' ? '4px solid #ef4444' : notification.priority === 'Medium' ? '4px solid #f59e0b' : '4px solid #10b981', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <strong style={{ color: '#0f172a' }}>{notification.title}</strong>
                    <span style={{ background: notification.priority === 'High' ? '#fee2e2' : notification.priority === 'Medium' ? '#fef3c7' : '#dcfce7', color: notification.priority === 'High' ? '#b91c1c' : notification.priority === 'Medium' ? '#92400e' : '#166534', borderRadius: '999px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700 }}>{notification.priority}</span>
                  </div>
                  <p style={{ margin: '0 0 0.4rem', color: '#475569', lineHeight: 1.5 }}>{notification.message}</p>
                  <small style={{ color: '#64748b' }}>{notification.time}</small>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default PassportOfficeDashboard;
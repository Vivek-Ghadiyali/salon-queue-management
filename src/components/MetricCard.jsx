export default function MetricCard({ label, value, detail, icon }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className="metric-icon" aria-hidden="true">{icon}</span></div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

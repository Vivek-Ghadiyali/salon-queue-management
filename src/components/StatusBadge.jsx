export default function StatusBadge({ children, tone = 'gold' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

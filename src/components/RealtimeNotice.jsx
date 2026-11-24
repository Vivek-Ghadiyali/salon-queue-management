import Panel from './Panel.jsx';

export default function RealtimeNotice({ status, error, lastUpdatedAt, onRetry }) {
  if (!status || status === 'preview' || (status === 'connected' && !error)) return null;
  const lastUpdate = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : null;
  const message = error
    ? `Live data could not refresh: ${error}${lastUpdate ? ` Showing the last successful refresh at ${lastUpdate}.` : ''}`
    : status === 'connecting'
      ? 'Connecting to live updates. Checking for changes every four seconds in the meantime.'
      : `Realtime is reconnecting. Checking for changes every four seconds${lastUpdate ? ` · last refreshed ${lastUpdate}` : ''}.`;
  return <Panel className="connection-banner realtime-notice" role="status" aria-live="polite"><span>{message}</span>{onRetry && <button type="button" className="text-link" onClick={onRetry}>Retry</button>}</Panel>;
}

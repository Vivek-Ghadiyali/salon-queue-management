import { Link } from 'react-router-dom';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import RealtimeNotice from '../components/RealtimeNotice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { barbersPreview, queuePreview } from '../data/previewData.js';
import usePageTitle from '../hooks/usePageTitle.js';
import useRealtimeRpc from '../hooks/useRealtimeRpc.js';
import { isSupabaseConfigured } from '../services/supabase.js';

export default function DisplayPage() {
  usePageTitle('Waiting Area Display');
  const { data, loading, error, realtimeStatus, lastUpdatedAt, reload } = useRealtimeRpc('get_public_tv_snapshot');
  const preview = !isSupabaseConfigured;
  const barbers = data?.barbers ?? (preview ? barbersPreview.map((barber) => ({ ...barber, current_token: barber.currentToken })) : []);
  const upcoming = data?.up_next ?? (preview ? queuePreview.filter((entry) => entry.status === 'Waiting').slice(0,5).map((entry) => ({ token: entry.token, wait_minutes: entry.estimate })) : []);
  return <main className="display-page">
    <header className="display-header"><Link className="brand" to="/" aria-label="Salon home"><span className="brand-mark">S</span><span className="brand-copy"><span className="brand-name">SALON</span><span className="brand-caption">QUEUE DISPLAY</span></span></Link><div className="display-header-right"><PreviewLabel>{preview ? 'Sample preview' : data ? 'Live display' : 'Connecting'}</PreviewLabel><span className="display-live"><span className={`status-dot ${error ? 'error-dot' : 'preview-dot'}`} />{error ? 'CONNECTION ISSUE' : preview ? 'SAMPLE DISPLAY · NOT LIVE' : data ? 'LIVE QUEUE DISPLAY' : 'CONNECTING'}</span></div></header>
    {data ? <RealtimeNotice status={realtimeStatus} error={error} lastUpdatedAt={lastUpdatedAt} onRetry={reload} /> : error&&<div className="connection-banner" role="status"><span>Could not refresh the public display. {error}</span><button className="text-link" type="button" onClick={reload}>Retry</button></div>}
    {loading && !data && isSupabaseConfigured && <div className="connection-banner" role="status">Loading current queue…</div>}
    <div className="display-intro"><span className="eyebrow">PLEASE MAKE YOURSELF AT HOME</span><h1>Your time is <em>coming.</em></h1><p>We’ll call your token when your barber is ready.</p></div>
    <div className="display-grid"><Panel className="display-stations"><div className="display-panel-head"><span className="eyebrow">WITH OUR BARBERS</span><span className="muted-copy">{preview ? 'Sample stations' : 'Current stations'}</span></div>{barbers.map((barber) => { const status = barber.status ?? 'Available'; const tone = status === 'Available' ? 'green' : status === 'Busy' || status === 'Called' ? 'blue' : 'muted'; return <div className="display-station" key={barber.id}><div className="display-barber-name"><small>{barber.specialty}</small><strong>{barber.name}</strong></div><div className={`now-token${status === 'Called' ? ' called-token' : ''}`}><small>{status === 'Called' ? 'JUST CALLED' : barber.current_token ? 'NOW SERVING' : 'NOW'}</small><strong>{barber.current_token ?? '— —'}</strong></div><StatusBadge tone={tone}>{status}</StatusBadge></div>; })}{!barbers.some((barber) => barber.current_token) && <div className="display-empty">No customers currently being served.</div>}</Panel>
      <Panel className="up-next-panel"><span className="eyebrow">UP NEXT</span>{upcoming.length ? <div className="up-next-tokens">{upcoming.map((entry, index) => <div className={`up-next-token${index === 0 ? ' first-up' : ''}`} key={`${entry.token}-${index}`}><span className="up-next-order">{String(index + 1).padStart(2,'0')}</span><strong>{entry.token}</strong><span className="up-next-time">{entry.wait_minutes == null ? '—' : `~${entry.wait_minutes} min`}</span></div>)}</div> : <div className="display-empty">No one waiting.</div>}<StatusBadge tone="muted">Tokens only · customer names are private</StatusBadge></Panel></div>
    <footer className="display-footer"><span>Thank you for choosing us</span><span>{preview ? 'Sample queue display · not connected to live updates' : 'Public display · no customer contact details shown'}</span></footer>
  </main>;
}

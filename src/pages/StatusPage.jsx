import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FeedbackToast from '../components/FeedbackToast.jsx';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import RealtimeNotice from '../components/RealtimeNotice.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { statusPreviews } from '../data/previewData.js';
import usePreviewFeedback from '../hooks/usePreviewFeedback.js';
import useRealtimeRpc from '../hooks/useRealtimeRpc.js';
import { displayQueueStatus, rpc } from '../services/salonApi.js';
import { isSupabaseConfigured } from '../services/supabase.js';

const tones = { Waiting: 'gold', Called: 'blue', 'In Chair': 'blue', Done: 'green', 'No-show': 'muted', Cancelled: 'muted' };

export default function StatusPage() {
  const { id: accessToken } = useParams();
  const { data, loading, error, realtimeStatus, lastUpdatedAt, reload } = useRealtimeRpc('get_customer_status', { p_access_token: accessToken });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const privateLinkRef = useRef(null);
  const { message, notify } = usePreviewFeedback();
  const sample = !isSupabaseConfigured ? statusPreviews[accessToken] : null;
  const liveStatus = data ? displayQueueStatus(data.status) : null;
  const currentStatus = data ? {
    token: data.token, status: liveStatus, position: data.position, waitMinutes: data.wait_minutes,
    services: data.services ?? [], preference: data.preferred_barber ?? 'Any barber', assignedBarber: data.assigned_barber,
    arrivingSoon: data.position === 2,
  } : sample;
  const isTerminal = ['Done', 'No-show', 'Cancelled'].includes(currentStatus?.status);
  const canCancel = currentStatus?.status === 'Waiting';
  const privateStatusUrl = isSupabaseConfigured ? `${window.location.origin}/status/${accessToken}` : '';

  async function copyPrivateStatusLink() {
    try {
      await navigator.clipboard.writeText(privateStatusUrl);
      notify('Private status link copied. Keep it to yourself.');
    } catch {
      privateLinkRef.current?.select();
      notify('Select and copy the private status link. Keep it to yourself.');
    }
  }

  async function cancelSpot() {
    setBusy(true); setActionError('');
    try { await rpc('cancel_customer_queue_entry', { p_access_token: accessToken }); setConfirmCancel(false); await reload(); notify('Your queue spot was cancelled.'); }
    catch (cancelError) { setActionError(cancelError.message); }
    finally { setBusy(false); }
  }

  if (isSupabaseConfigured && loading && !data) return <div className="content-page status-page"><SectionHeading eyebrow="YOUR SALON VISIT" title="Your place in line" description="Loading your private queue status…" /><Panel className="connection-banner" role="status">Checking the latest queue status…</Panel></div>;
  if (isSupabaseConfigured && !data) return <div className="content-page status-page"><SectionHeading eyebrow="YOUR SALON VISIT" title="Status unavailable" description="We could not find this private status link or the connection is unavailable." action={<PreviewLabel>Private link</PreviewLabel>} /><Panel className="status-not-found"><strong>{error ? 'Could not load your queue status.' : 'This status link is not valid.'}</strong><p>{error || 'Use the private link shown after joining. Keep it to yourself; it grants access to your queue details.'}</p>{error && <button className="button button-outline" type="button" onClick={reload}>Retry</button>}</Panel></div>;
  if (!currentStatus) return <div className="content-page status-page"><SectionHeading eyebrow="SAMPLE STATUS PAGE" title="No matching sample entry" description="Sample entries only work when Supabase is not configured." action={<PreviewLabel />} /><Panel className="status-not-found"><strong>We couldn’t find that sample status.</strong><p>Return to the join form to preview the sample status link.</p><Link className="button button-outline" to="/join">Join queue</Link></Panel></div>;
  const serviceRows = currentStatus.services.map((item) => typeof item === 'string' ? { name: item, duration: null } : item);
  return <div className="content-page status-page">
    <SectionHeading eyebrow="YOUR SALON VISIT" title="Your place in line" description={isSupabaseConfigured ? 'Your queue status refreshes automatically.' : 'A sample customer status page. No live queue data is connected.'} action={<PreviewLabel>{isSupabaseConfigured ? 'Private status' : 'Sample preview'}</PreviewLabel>} />
    {data && <RealtimeNotice status={realtimeStatus} error={error} lastUpdatedAt={lastUpdatedAt} onRetry={reload} />}{actionError && <Panel className="connection-banner" role="alert">{actionError}</Panel>}
    <div className="status-main-grid"><Panel className="status-token-panel"><span className="eyebrow">YOUR QUEUE TOKEN</span><strong className="token-value">{currentStatus.token}</strong><StatusBadge tone={tones[currentStatus.status]}>{currentStatus.status}</StatusBadge><small>{isSupabaseConfigured ? 'Private queue status' : 'Sample status'}</small></Panel><div className="status-quick-metrics"><Panel className="status-metric"><span className="eyebrow">QUEUE STATUS</span><strong>{currentStatus.status === 'Waiting' ? `#${currentStatus.position}` : currentStatus.status === 'Called' ? 'Your turn' : currentStatus.status === 'In Chair' ? 'In service' : currentStatus.status}</strong><small>{currentStatus.status === 'Called' ? 'Please head to your barber' : currentStatus.status === 'Waiting' ? 'Position in queue' : 'Queue entry status'}</small></Panel><Panel className="status-metric"><span className="eyebrow">ESTIMATED WAIT</span><strong>{currentStatus.status === 'Waiting' ? (currentStatus.waitMinutes == null ? 'Unavailable' : `~${currentStatus.waitMinutes} min`) : currentStatus.status === 'Called' ? 'Now' : '—'}</strong><small>Approximate, not guaranteed</small></Panel></div></div>
    {isSupabaseConfigured && <Panel className="private-status-link"><div><span className="eyebrow">SAVE YOUR PRIVATE LINK</span><p>Use My Status in the navigation to reopen your progress with this link. Do not share it.</p></div><div className="private-status-link-row"><input ref={privateLinkRef} type="url" aria-label="Your private status link" readOnly value={privateStatusUrl} onFocus={(event) => event.target.select()} /><button type="button" className="button button-outline" onClick={copyPrivateStatusLink}>Copy link</button></div></Panel>}
    {currentStatus.status === 'Called' && <Panel className="turn-callout"><span className="turn-icon">✧</span><div><span className="eyebrow">YOUR TURN</span><h2>It’s your turn! Go to {currentStatus.assignedBarber}.</h2><p>Please make your way to the chair.</p></div></Panel>}
    {currentStatus.status === 'In Chair' && <Panel className="turn-callout"><span className="turn-icon">✧</span><div><span className="eyebrow">SERVICE IN PROGRESS</span><h2>You’re with {currentStatus.assignedBarber}.</h2><p>Your service is underway.</p></div></Panel>}
    {isTerminal && <Panel className={`status-outcome ${currentStatus.status === 'Done' ? 'complete' : ''}`}><span className="turn-icon">{currentStatus.status === 'Done' ? '✓' : 'i'}</span><div><span className="eyebrow">VISIT STATUS</span><h2>{currentStatus.status === 'Done' ? 'Your service is complete.' : `This spot is ${currentStatus.status.toLowerCase()}.`}</h2><p>{currentStatus.status === 'Done' ? 'Thank you for visiting. We hope to see you again.' : 'This queue entry is no longer active.'}</p></div></Panel>}
    {currentStatus.arrivingSoon && <Panel className="coming-soon"><span className="coming-icon">↗</span><div><strong>Start coming to the salon</strong><p>You’re second in line. Leave enough time for your trip.</p></div></Panel>}
    <div className="status-detail-grid"><Panel className="status-detail-card"><div className="panel-heading"><div><span className="eyebrow">YOUR VISIT</span><h2>Selected services</h2></div><StatusBadge tone="muted">{isSupabaseConfigured ? 'Saved' : 'Sample'}</StatusBadge></div><ul className="detail-service-list">{serviceRows.map((service, index) => <li key={`${service.name}-${index}`}><span>{service.name}</span><span>{service.duration == null ? '—' : `${service.duration} min`}</span></li>)}</ul><div className="detail-preference"><span>{currentStatus.assignedBarber ? 'Assigned barber' : 'Barber preference'}</span><strong>{currentStatus.assignedBarber ?? currentStatus.preference}</strong></div></Panel><Panel className="status-detail-card progress-card"><span className="eyebrow">YOUR PROGRESS</span>{['No-show','Cancelled'].includes(currentStatus.status) ? <div className="closed-progress"><strong>Entry closed</strong><small>This spot is not active in the queue.</small></div> : <ol className="timeline status-timeline"><li className="done"><span>✓</span><div><strong>Joined the queue</strong><small>Your entry was received</small></div></li><li className={currentStatus.status === 'Waiting' ? 'current' : 'done'}><span>{currentStatus.status === 'Waiting' ? '2' : '✓'}</span><div><strong>{currentStatus.status === 'Waiting' ? 'Waiting for your turn' : currentStatus.status === 'Called' ? 'You have been called' : 'Barber is ready'}</strong><small>{currentStatus.status === 'Waiting' ? 'We’ll update this page when your status changes' : currentStatus.status === 'Called' ? `Go to ${currentStatus.assignedBarber}` : 'Your service is in progress or complete'}</small></div></li><li className={currentStatus.status === 'In Chair' ? 'current' : currentStatus.status === 'Done' ? 'done' : ''}><span>{currentStatus.status === 'Done' ? '✓' : '3'}</span><div><strong>Service complete</strong><small>Enjoy your visit</small></div></li></ol>}</Panel></div>
    <Panel className="connection-banner"><span className="connection-symbol">↻</span><span>{isSupabaseConfigured ? 'Updates arrive automatically. If the connection drops, the last status remains visible.' : 'Sample preview only. This page does not refresh from live queue data.'}</span></Panel>
    <div className="status-actions">{canCancel && <button type="button" className="button button-text-danger" onClick={() => setConfirmCancel(true)}>Cancel my spot</button>}</div><FeedbackToast message={message} />
    {confirmCancel && <ConfirmDialog title="Cancel your queue spot?" description="This will remove your waiting entry from the active queue. This cannot be undone." confirmLabel={busy ? 'Cancelling…' : 'Cancel my spot'} onClose={() => setConfirmCancel(false)} onConfirm={cancelSpot} />}
  </div>;
}

import { useMemo, useState } from 'react';
import MetricCard from '../components/MetricCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FeedbackToast from '../components/FeedbackToast.jsx';
import RealtimeNotice from '../components/RealtimeNotice.jsx';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StaffGate from '../components/StaffGate.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useRealtimeRpc from '../hooks/useRealtimeRpc.js';
import usePreviewFeedback from '../hooks/usePreviewFeedback.js';
import { displayQueueStatus, rpc } from '../services/salonApi.js';
import { uniqueServiceOptions } from '../utils/serviceOptions.js';

const filters = ['All', 'Waiting', 'Called', 'In Chair', 'Done', 'No-show', 'Cancelled'];
const tones = { Waiting: 'gold', Called: 'blue', 'In Chair': 'green', Done: 'green', 'No-show': 'muted', Cancelled: 'muted' };
const priceText = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value ?? 0);

function WalkInDialog({ services, barbers, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', services: [], barber: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return setError('Enter the customer name.');
    if (!/^\d{10}$/.test(form.phone)) return setError('Enter a phone number with exactly 10 digits.');
    if (!form.services.length || form.services.length > 3) return setError('Choose one to three services.');
    setBusy(true); setError('');
    try { await onSave(form); }
    catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="confirm-dialog walk-in-dialog" role="dialog" aria-modal="true" aria-labelledby="walkin-title"><span className="eyebrow">RECEPTION WALK-IN</span><h2 id="walkin-title">Add to the queue</h2><p>Walk-ins remain available when online joining is closed.</p><form className="modal-form" onSubmit={submit} noValidate><label className="field">Customer name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="field">10-digit phone<input type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g,'').slice(0,10) })} /></label><fieldset className="walkin-services"><legend className="field-help">Services · choose 1–3</legend>{services.filter((service) => service.enabled !== false).map((service) => <label key={service.id}><input type="checkbox" checked={form.services.includes(service.id)} disabled={!form.services.includes(service.id) && form.services.length>=3} onChange={() => setForm((current) => ({ ...current, services: current.services.includes(service.id) ? current.services.filter((id) => id!==service.id) : [...current.services,service.id] }))} />{service.name} · {service.duration} min · {priceText(service.price)}</label>)}</fieldset><label className="field">Barber preference<select value={form.barber} onChange={(event) => setForm({ ...form, barber: event.target.value })}><option value="">Any barber</option>{barbers.filter((person) => person.on_duty && !person.on_break).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>{error && <p className="field-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Close</button><button type="submit" className="button button-gold" disabled={busy}>{busy ? 'Adding…' : 'Add walk-in'}</button></div></form></section></div>;
}

function ReceptionDashboard() {
  const { data, loading, error, realtimeStatus, lastUpdatedAt, reload } = useRealtimeRpc('get_staff_dashboard');
  const [filter, setFilter] = useState('All');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [busyId, setBusyId] = useState('');
  const { message, notify } = usePreviewFeedback();
  const queue = data?.queue ?? [];
  const barbers = data?.barbers ?? [];
  const services = uniqueServiceOptions(data?.salon?.services ?? []);
  const visibleQueue = useMemo(() => filter === 'All' ? queue : queue.filter((entry) => displayQueueStatus(entry.status) === filter), [filter, queue]);
  const waitingCount = queue.filter((entry) => entry.status === 'waiting').length;
  const inServiceCount = queue.filter((entry) => entry.status === 'in_chair').length;
  const calledCount = queue.filter((entry) => entry.status === 'called').length;

  async function runAction(id, fn, success) {
    setBusyId(id); setPendingAction(null);
    try { await rpc(fn, { p_entry_id: id }); await reload(); notify(success); }
    catch (actionError) { notify(actionError.message); }
    finally { setBusyId(''); }
  }
  async function callNext(barber) {
    setBusyId(barber.id);
    try { const result = await rpc('call_next', { p_barber_id: barber.id }); await reload(); notify(`${result.token} called to ${result.barber_name}.`); }
    catch (actionError) { notify(actionError.message); }
    finally { setBusyId(''); }
  }
  async function addWalkIn(form) {
    const result = await rpc('add_walk_in', { p_customer_name: form.name.trim(), p_phone_number: form.phone, p_service_ids: form.services, p_preferred_barber_id: form.barber || null });
    setShowWalkIn(false); await reload(); notify(`${result.token} added to the queue.`);
  }

  if (loading && !data) return <div className="content-page reception-page"><SectionHeading eyebrow="STAFF WORKSPACE" title="Reception dashboard" description="Loading current queue data…" /><Panel className="connection-banner" role="status">Loading queue and barber stations…</Panel></div>;
  return <div className="content-page reception-page">
    <SectionHeading eyebrow="STAFF WORKSPACE" title="Reception dashboard" description="Manage today’s waiting queue and barber assignments." action={<PreviewLabel>Live data</PreviewLabel>} />
    {data ? <RealtimeNotice status={realtimeStatus} error={error} lastUpdatedAt={lastUpdatedAt} onRetry={reload} /> : (error || !loading) && <Panel className="connection-banner" role="status"><span>{error || 'No dashboard data was returned.'}</span><button type="button" className="text-link" onClick={reload}>Retry</button></Panel>}
    <div className="reception-top-actions"><div className="reception-open-state"><span className={`status-dot ${data?.salon?.salon?.online_open ? 'preview-dot' : 'error-dot'}`} /><span>Online joining is {data?.salon?.salon?.online_open ? 'open' : 'closed'} · walk-ins remain available.</span></div><button type="button" className="button button-gold" onClick={() => setShowWalkIn(true)} disabled={!services.length}>＋ Add walk-in</button></div>
    <div className="metrics-grid reception-metrics"><MetricCard label="Waiting" value={String(waitingCount).padStart(2,'0')} detail="Active queue" icon="◷" /><MetricCard label="Called" value={String(calledCount).padStart(2,'0')} detail="Awaiting arrival" icon="↗" /><MetricCard label="In service" value={String(inServiceCount).padStart(2,'0')} detail="Currently with a barber" icon="✳" /></div>
    <section className="reception-stations-section"><div className="section-inline"><div><p className="eyebrow">THE FLOOR</p><h2>Barber stations</h2></div><span className="muted-copy">Assignments update automatically</span></div><div className="station-grid">{barbers.map((barber) => { const eligible = queue.some((entry) => entry.status==='waiting' && (!entry.preferred_barber_id || entry.preferred_barber_id===barber.id)); const disabled = !barber.on_duty || barber.on_break || Boolean(barber.current_token) || !eligible || busyId===barber.id; const tone = barber.status==='Available' ? 'green' : barber.status==='Busy' ? 'blue' : 'muted'; return <Panel className="reception-station" key={barber.id}><div className="station-card-head"><span className="barber-avatar">{barber.name.split(' ').map((word)=>word[0]).slice(0,2).join('')}</span><StatusBadge tone={tone}>{barber.status}</StatusBadge></div><strong className="station-name">{barber.name}</strong><small className="station-specialty">{barber.specialty}</small><div className="station-customer">{barber.current_token ? <><span>Active token</span><strong>{barber.current_token}</strong></> : <><span>Current customer</span><strong className="muted-value">—</strong></>}</div><button type="button" className="button button-outline button-full" disabled={disabled} title={!eligible ? 'No waiting customer matches this preference.' : undefined} onClick={() => callNext(barber)}>{busyId===barber.id ? 'Calling…' : 'Call next'}</button>{!eligible && barber.status==='Available' && <small className="station-no-match">No waiting customer matches {barber.name}.</small>}</Panel>; })}</div>{!barbers.length && <Panel className="home-empty-queue"><strong>No barbers configured yet.</strong><span>Ask the owner to add the salon team in Owner Settings.</span></Panel>}</section>
    <Panel className="queue-panel"><div className="queue-panel-heading"><div><p className="eyebrow">TODAY’S QUEUE</p><h2>Customer list <span className="count-pill">{visibleQueue.length}</span></h2></div><PreviewLabel>Private staff view</PreviewLabel></div><div className="filter-row" role="group" aria-label="Filter queue by status">{filters.map((item) => <button type="button" key={item} className={`filter-chip${filter===item?' active':''}`} aria-pressed={filter===item} onClick={()=>setFilter(item)}>{item}{item==='All'&&<span>{queue.length}</span>}</button>)}</div>
      {visibleQueue.length===0 ? <div className="queue-empty"><strong>{filter==='Waiting'?'No one waiting — walk right in!':`No ${filter==='All'?'queue':filter.toLowerCase()} entries today.`}</strong><p>{filter==='Waiting'?'Add a walk-in if needed.':''}</p></div> : <div className="queue-table-wrap"><table className="queue-table"><thead><tr><th>Token & customer</th><th>Phone</th><th>Services</th><th>Barber preference</th><th>Wait estimate</th><th>Status</th><th>Queue actions</th></tr></thead><tbody>{visibleQueue.map((entry)=>{const status=displayQueueStatus(entry.status);const calledLongEnough=entry.called_at&&Date.now()-new Date(entry.called_at).getTime()>=10*60*1000;return <tr className={entry.wait_minutes>60?'long-wait':''} key={entry.id}><td><div className="customer-token-cell"><strong>{entry.token}</strong><span>{entry.name}</span><small>{entry.source.replace('_',' ')} · today</small></div></td><td><a href={`tel:${entry.phone}`}>{entry.phone}</a></td><td>{(entry.services??[]).map((service,index)=><span className="table-service" key={`${service.name}-${index}`}>{service.name}</span>)}</td><td>{entry.assigned_barber??entry.preferred_barber??'Any barber'}{entry.assigned_barber&&<small className="table-subline">Assigned barber</small>}</td><td>{status==='Waiting'?(entry.wait_minutes==null?'Unavailable':`~${entry.wait_minutes} min`):'—'}</td><td><StatusBadge tone={tones[status]}>{status}</StatusBadge></td><td><div className="row-actions">{status==='Waiting'&&<button type="button" className="table-action danger-action" disabled={busyId===entry.id} onClick={()=>setPendingAction({entry,action:'cancel'})}>Cancel</button>}{status==='Called'&&<button type="button" className="table-action" disabled={!calledLongEnough||busyId===entry.id} title={!calledLongEnough?'Available after 10 minutes from call time':''} onClick={()=>runAction(entry.id,'mark_queue_no_show',`${entry.token} marked No-show.`)}>No-show</button>}{status==='No-show'&&<button type="button" className="table-action" disabled={busyId===entry.id} onClick={()=>runAction(entry.id,'readd_no_show',`${entry.name} added at the end with a new token.`)}>Add again</button>}</div></td></tr>;})}</tbody></table></div>}
      <p className="table-footnote">Customer names and phone numbers are visible to authenticated reception and owner staff only.</p>
    </Panel>
    <FeedbackToast message={message}/>{showWalkIn&&<WalkInDialog services={services} barbers={barbers} onClose={()=>setShowWalkIn(false)} onSave={addWalkIn}/>}{pendingAction&&<ConfirmDialog title={`Cancel ${pendingAction.entry.token}?`} description="This will cancel the waiting entry and remove it from the active queue." confirmLabel="Cancel queue spot" onClose={()=>setPendingAction(null)} onConfirm={()=>runAction(pendingAction.entry.id,'mark_queue_cancelled',`${pendingAction.entry.token} cancelled.`)}/>}
  </div>;
}

export default function ReceptionPage() {
  return <StaffGate title="Reception dashboard" description="Sign in to manage today’s queue." roles={['owner','receptionist']}><ReceptionDashboard/></StaffGate>;
}

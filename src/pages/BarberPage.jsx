import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FeedbackToast from '../components/FeedbackToast.jsx';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import RealtimeNotice from '../components/RealtimeNotice.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StaffGate from '../components/StaffGate.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import usePreviewFeedback from '../hooks/usePreviewFeedback.js';
import useRealtimeRpc from '../hooks/useRealtimeRpc.js';
import { rpc } from '../services/salonApi.js';
import { useStaffAuth } from '../contexts/StaffAuthContext.jsx';

function BarberWorkspace() {
  const { profile } = useStaffAuth();
  const { data, loading, error, realtimeStatus, lastUpdatedAt, reload } = useRealtimeRpc('get_barber_dashboard');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const { message, notify } = usePreviewFeedback();
  const barber = data?.barber;
  const current = data?.current;
  const next = data?.next;
  const currentStatus = current?.status;

  useEffect(() => {
    if (!current?.service_started_at) { setElapsed(''); return undefined; }
    const update = () => {
      const seconds = Math.max(0, Math.floor((Date.now()-new Date(current.service_started_at).getTime())/1000));
      setElapsed(`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`);
    };
    update(); const timer = window.setInterval(update,1000); return () => window.clearInterval(timer);
  }, [current?.service_started_at]);

  async function action(fn, params, success) {
    setBusy(true);
    try { await rpc(fn,params); await reload(); notify(success); }
    catch (actionError) { notify(actionError.message); }
    finally { setBusy(false); }
  }
  async function toggleBreak() {
    await action('set_my_barber_break',{p_on_break:!barber?.on_break},barber?.on_break?'You are available for assignments.':'You are on break.');
  }

  if (loading&&!data) return <div className="content-page barber-workspace"><SectionHeading eyebrow="BARBER WORKSPACE" title="Your barber view" description="Loading assigned queue data…"/><Panel className="connection-banner" role="status">Loading your current assignment…</Panel></div>;
  return <div className="content-page barber-workspace">
    <SectionHeading eyebrow="BARBER WORKSPACE" title={barber?.name??profile?.barber_name??'Your barber view'} description={`${barber?.specialty??'Service workspace'} · assigned staff view`} action={<PreviewLabel>Live data</PreviewLabel>}/>
    {data ? <RealtimeNotice status={realtimeStatus} error={error} lastUpdatedAt={lastUpdatedAt} onRetry={reload} /> : error&&<Panel className="connection-banner" role="status"><span>{error}</span><button type="button" className="text-link" onClick={reload}>Retry</button></Panel>}
    {barber&&<Panel className="barber-availability-card"><div className="availability-person"><span className="barber-avatar large-avatar">{barber.name.split(' ').map((part)=>part[0]).slice(0,2).join('')}</span><div><span className="eyebrow">YOUR AVAILABILITY</span><strong>{barber.on_break?'On break':barber.on_duty?'Available for service':'Off duty'}</strong><small>Availability updates the shared salon queue</small></div></div><button type="button" className={`switch-control${barber.on_break?' is-on':''}`} role="switch" aria-checked={barber.on_break} disabled={!barber.on_duty||busy} onClick={toggleBreak}><span/>{busy?'Saving…':barber.on_break?'On break':'Available'}</button></Panel>}
    {!barber&&<Panel className="connection-banner">No barber profile is assigned to this staff account. Ask the owner to link this login to a barber.</Panel>}
    <div className="barber-work-grid"><Panel className="barber-current-card"><div className="panel-heading"><div><span className="eyebrow">CURRENT CUSTOMER</span><h2>{current?.token??'Your next guest'}</h2></div><StatusBadge tone={currentStatus==='in_chair'?'blue':currentStatus==='called'?'gold':'muted'}>{currentStatus==='in_chair'?'In Chair':currentStatus==='called'?'Called':'Waiting'}</StatusBadge></div>
      {current?<><div className="barber-customer-info"><div className="customer-placeholder-avatar">{current.name.slice(0,1)}</div><div><strong>{current.name}</strong><small>Current assigned customer</small></div></div><div className="barber-service-list"><span className="eyebrow">SELECTED SERVICES</span>{(current.services??[]).map((service,index)=><div className="barber-service-row" key={`${service.name}-${index}`}><span>{service.name}</span><span>{service.duration} min</span></div>)}</div><div className="barber-service-time"><span>Service elapsed</span><strong>{currentStatus==='in_chair'?elapsed:'— — : — —'}</strong><small>{currentStatus==='in_chair'?'Timer from service start':'Timer begins when you start'}</small></div><div className="barber-action-row"><button type="button" className="button button-gold" disabled={busy||currentStatus!=='called'||barber?.on_break} onClick={()=>action('start_queue_service',{p_entry_id:current.id},`${current.token} service started.`)}>Start service</button><button type="button" className="button button-outline" disabled={busy||currentStatus!=='in_chair'} onClick={()=>action('complete_queue_service',{p_entry_id:current.id},`${current.token} marked Done.`)}>Mark done</button></div></>:<div className="empty-message barber-empty"><span className="empty-icon">✳</span><strong>{barber?.on_break?'You are on break':'No current customer'}</strong><p>{barber?.on_break?'Return to Available when you are ready for an assignment.':'Reception will call the next eligible customer for your chair.'}</p></div>}
    </Panel><div className="barber-side-column"><Panel className="next-for-you-card"><span className="eyebrow">NEXT FOR YOU</span>{next?<><div className="next-for-you-token">{next.token}</div><strong>{next.preference}</strong><p>{next.wait_minutes==null?'Approximate wait unavailable':`Approximate wait · ${next.wait_minutes} min`}</p><StatusBadge tone="gold">Waiting</StatusBadge></>:<div className="empty-message"><strong>No matching waiting customer</strong><p>Customers who chose Any barber or your name can appear here.</p></div>}</Panel><Panel className="barber-shortcuts"><span className="eyebrow">YOUR SCREENS</span><Link to="/reception">Reception dashboard <span>↗</span></Link><Link to="/display">Waiting area display <span>↗</span></Link></Panel></div></div>
    <p className="demo-notice">Customer details in this view are available to the assigned barber profile only.</p><FeedbackToast message={message}/>
  </div>;
}

export default function BarberPage() {
  return <StaffGate title="Barber view" description="Sign in with your assigned barber account to manage your current customer." roles={['barber']}><BarberWorkspace/></StaffGate>;
}

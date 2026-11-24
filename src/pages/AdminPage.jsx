import { useEffect, useState } from 'react';
import BarberEditorDialog from '../components/BarberEditorDialog.jsx';
import FeedbackToast from '../components/FeedbackToast.jsx';
import MetricCard from '../components/MetricCard.jsx';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ServiceEditorDialog from '../components/ServiceEditorDialog.jsx';
import StaffGate from '../components/StaffGate.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import usePreviewFeedback from '../hooks/usePreviewFeedback.js';
import useRealtimeRpc from '../hooks/useRealtimeRpc.js';
import { rpc } from '../services/salonApi.js';
import { normalizeServiceName, uniqueServiceOptions } from '../utils/serviceOptions.js';

const weekdays = [[1,'Monday'],[2,'Tuesday'],[3,'Wednesday'],[4,'Thursday'],[5,'Friday'],[6,'Saturday'],[7,'Sunday']];
const priceText = (value) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value??0);

function OwnerSettings() {
  const { data, loading, error, reload } = useRealtimeRpc('get_owner_settings');
  const [salon, setSalon] = useState(null);
  const [editingService, setEditingService] = useState(undefined);
  const [editingBarber, setEditingBarber] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const { message, notify } = usePreviewFeedback();
  useEffect(() => {
    if (data?.salon) setSalon((current) => current ?? { ...data.salon, opening_time: data.salon.opening_time.slice(0,5), closing_time: data.salon.closing_time.slice(0,5), working_days: data.salon.working_days??[], manual_open: data.salon.manual_open });
  }, [data]);
  const services = data?.services??[];
  const duplicateServiceCount = services.length - uniqueServiceOptions(services).length;
  const barbers = data?.barbers??[];
  const stats = data?.stats??{};

  async function saveSalon(event) {
    event.preventDefault(); setBusy(true);
    try { const result = await rpc('save_salon_settings',{p_name:salon.name,p_address:salon.address,p_opening_time:salon.opening_time,p_closing_time:salon.closing_time,p_working_days:salon.working_days,p_online_manual_open:salon.manual_open}); setSalon((current)=>({...current,online_open:result.online_open})); await reload(); notify('Salon settings saved.'); }
    catch (saveError) { notify(saveError.message); }
    finally { setBusy(false); }
  }
  async function saveService(service) {
    const existing = services.find((item) => item.id === service.id);
    const nameChanged = !existing || normalizeServiceName(existing.name) !== normalizeServiceName(service.name);
    const duplicate = services.some((item) => item.id !== service.id && normalizeServiceName(item.name) === normalizeServiceName(service.name));
    if (nameChanged && duplicate) throw new Error('A service with this name already exists. Edit its existing record instead.');
    await rpc('upsert_service',{p_id:service.id,p_name:service.name,p_description:service.description,p_category:service.category,p_duration_minutes:service.duration,p_price:service.price,p_enabled:service.enabled??true});
    setEditingService(undefined); await reload(); notify('Service saved.');
  }
  async function toggleService(service) {
    try { await rpc('upsert_service',{p_id:service.id,p_name:service.name,p_description:service.description,p_category:service.category,p_duration_minutes:service.duration,p_price:service.price,p_enabled:!service.enabled}); await reload(); }
    catch (saveError) { notify(saveError.message); }
  }
  async function saveBarber(barber) {
    await rpc('upsert_barber',{p_id:barber.id,p_name:barber.name,p_specialty:barber.specialty,p_on_duty:barber.onDuty});
    setEditingBarber(undefined); await reload(); notify('Barber saved.');
  }
  async function toggleDuty(barber) {
    try { await rpc('upsert_barber',{p_id:barber.id,p_name:barber.name,p_specialty:barber.specialty,p_on_duty:!barber.on_duty}); await reload(); }
    catch (saveError) { notify(saveError.message); }
  }
  if (loading&&!data) return <div className="content-page admin-page"><SectionHeading eyebrow="SALON MANAGEMENT" title="Owner settings" description="Loading saved salon settings…"/><Panel className="connection-banner" role="status">Loading services, staff and today’s statistics…</Panel></div>;
  const update = (key) => (event) => setSalon((current)=>({...current,[key]:event.target.value}));
  return <div className="content-page admin-page">
    <SectionHeading eyebrow="SALON MANAGEMENT" title="Owner settings" description="Configure salon hours, services, staff availability and online joining." action={<PreviewLabel>Saved settings</PreviewLabel>}/>
    {error&&<Panel className="connection-banner" role="status"><span>{error}</span><button type="button" className="text-link" onClick={reload}>Retry</button></Panel>}
    {duplicateServiceCount>0&&<Panel className="connection-banner" role="status">Found {duplicateServiceCount} duplicate-named service record(s). Customer menus show one option per name; records are preserved here for review or disabling.</Panel>}
    <div className="metrics-grid admin-metrics"><MetricCard label="Served today" value={String(stats.served_today??0).padStart(2,'0')} detail="Completed queue entries" icon="✳"/><MetricCard label="Average wait" value={stats.average_wait==null?'—':`${stats.average_wait} min`} detail="For customers who started" icon="◷"/><MetricCard label="No-shows" value={String(stats.no_shows??0).padStart(2,'0')} detail="Today" icon="↗"/></div>
    {salon&&<form className="settings-form" onSubmit={saveSalon}><Panel className="settings-panel"><div className="panel-heading"><div><span className="eyebrow">SALON PROFILE</span><h2>Salon details</h2></div><StatusBadge tone="muted">{salon.timezone} · {salon.currency}</StatusBadge></div>
      <div className="settings-fields"><label className="field">Salon name<input required value={salon.name} onChange={update('name')}/></label><label className="field">Address<input value={salon.address} onChange={update('address')}/></label><label className="field">Opening time<input type="time" required value={salon.opening_time} onChange={update('opening_time')}/></label><label className="field">Closing time<input type="time" required value={salon.closing_time} onChange={update('closing_time')}/></label></div>
      <fieldset className="working-days-field"><legend className="field-help">Working days</legend><div className="working-days-grid">{weekdays.map(([day,label])=><label key={day}><input type="checkbox" checked={salon.working_days.includes(day)} onChange={(event)=>setSalon((current)=>({...current,working_days:event.target.checked?[...current.working_days,day].sort():current.working_days.filter((value)=>value!==day)}))}/>{label}</label>)}</div></fieldset>
      <div className="settings-fields"><label className="field">Online joining override<select value={salon.manual_open==null?'automatic':salon.manual_open?'open':'closed'} onChange={(event)=>setSalon((current)=>({...current,manual_open:event.target.value==='automatic'?null:event.target.value==='open'}))}><option value="automatic">Automatic schedule</option><option value="open">Manually open</option><option value="closed">Manually closed</option></select><span className="field-help">Online joining still closes 30 minutes before closing time.</span></label><div className="field"><span>Current online joining</span><StatusBadge tone={salon.online_open?'green':'muted'}>{salon.online_open?'Open':'Closed'}</StatusBadge><small className="field-help">Manual closing overrides automatic opening.</small></div></div>
      <div className="settings-panel-footer"><p className="field-help">Timezone: Asia/Kolkata · Currency: INR</p><button type="submit" className="button button-outline" disabled={busy}>{busy?'Saving…':'Save salon settings'}</button></div>
    </Panel></form>}
    <Panel className="settings-panel services-settings"><div className="panel-heading"><div><span className="eyebrow">SERVICE MENU</span><h2>Services & pricing</h2></div><button type="button" className="button button-gold" onClick={()=>setEditingService(null)}>＋ Add service</button></div><p className="settings-explainer">Queue entries retain their original service name, duration and price when the menu changes.</p>{services.length?<div className="settings-table-wrap"><table className="settings-table"><thead><tr><th>Service</th><th>Duration</th><th>Price</th><th>Available to join</th><th/></tr></thead><tbody>{services.map((service)=><tr key={service.id} className={!service.enabled?'service-disabled-row':''}><td><strong>{service.name}</strong><small>{service.category}</small></td><td>{service.duration} min</td><td>{priceText(service.price)}</td><td><label className="settings-switch-row"><span className="settings-switch-copy"><strong>{service.enabled?'Enabled':'Disabled'}</strong></span><input className="sr-only" type="checkbox" role="switch" checked={service.enabled} onChange={()=>toggleService(service)}/><span className={`switch-control${service.enabled?' is-on':''}`} aria-hidden="true"><span/></span></label></td><td><button type="button" className="table-action" onClick={()=>setEditingService(service)}>Edit</button></td></tr>)}</tbody></table></div>:<div className="empty-message"><strong>No services configured</strong><p>Add a service before customers can join.</p></div>}</Panel>
    <Panel className="settings-panel barbers-settings"><div className="panel-heading"><div><span className="eyebrow">SALON TEAM</span><h2>Barbers on duty</h2></div><button type="button" className="button button-gold" onClick={()=>setEditingBarber(null)}>＋ Add barber</button></div>{barbers.length?<div className="admin-barber-list">{barbers.map((barber)=><div className="admin-barber-row" key={barber.id}><span className="barber-avatar">{barber.name.split(' ').map((part)=>part[0]).slice(0,2).join('')}</span><span className="admin-barber-name"><strong>{barber.name}</strong><small>{barber.specialty||'Salon barber'}</small></span><StatusBadge tone={barber.on_break?'muted':barber.on_duty?'green':'muted'}>{barber.on_break?'On break':barber.on_duty?'On duty':'Off duty'}</StatusBadge><label className="settings-switch-row"><span className="settings-switch-copy"><strong>{barber.on_duty?'On duty':'Off duty'}</strong></span><input className="sr-only" type="checkbox" checked={barber.on_duty} onChange={()=>toggleDuty(barber)}/><span className={`switch-control${barber.on_duty?' is-on':''}`} aria-hidden="true"><span/></span></label><button type="button" className="table-action" onClick={()=>setEditingBarber(barber)}>Edit</button></div>)}</div>:<div className="empty-message"><strong>No barbers configured</strong><p>Add barbers and create staff accounts to begin assigning queue entries.</p></div>}</Panel>
    <p className="settings-explainer">Staff logins are created in Supabase Auth, then linked to a barber or staff role in <code>staff_profiles</code>. The setup guide includes the SQL steps.</p>
    <FeedbackToast message={message}/>{editingService!==undefined&&<ServiceEditorDialog service={editingService} onClose={()=>setEditingService(undefined)} onSave={saveService}/ >}{editingBarber!==undefined&&<BarberEditorDialog barber={editingBarber} onClose={()=>setEditingBarber(undefined)} onSave={saveBarber}/>}
  </div>;
}

export default function AdminPage() {
  return <StaffGate title="Owner settings" description="Sign in with an owner account to manage salon configuration." roles={['owner']}><OwnerSettings/></StaffGate>;
}

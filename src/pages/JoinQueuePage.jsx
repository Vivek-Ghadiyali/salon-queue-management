import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FeedbackToast from '../components/FeedbackToast.jsx';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import { barbersPreview, queuePreview, salonPreview, servicesPreview } from '../data/previewData.js';
import usePreviewFeedback from '../hooks/usePreviewFeedback.js';
import useRealtimeRpc from '../hooks/useRealtimeRpc.js';
import { isSupabaseConfigured } from '../services/supabase.js';
import { rpc } from '../services/salonApi.js';
import { uniqueServiceOptions } from '../utils/serviceOptions.js';

const priceText = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value ?? 0);

export default function JoinQueuePage() {
  const navigate = useNavigate();
  const { data, loading, error: connectionError, reload } = useRealtimeRpc('get_public_salon_snapshot');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [barber, setBarber] = useState('any');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { message, notify } = usePreviewFeedback();
  const salon = data?.salon ?? salonPreview;
  const services = uniqueServiceOptions(isSupabaseConfigured ? (data?.services ?? []) : servicesPreview.map((service) => ({ ...service, enabled: true })));
  const barbers = isSupabaseConfigured ? (data?.barbers ?? []) : barbersPreview;
  const onlineOpen = isSupabaseConfigured ? Boolean(salon?.online_open) : salonPreview.onlineOpen;
  const availableBarbers = barbers.filter((person) => person.on_duty !== false && person.on_break !== true && (person.status === 'Available' || (person.on_duty && !person.on_break)));
  const selectedUnavailableBarber = barber !== 'any' ? barbers.find((person) => person.id === barber && !availableBarbers.some((available) => available.id === person.id)) : null;
  const selectedServiceDetails = useMemo(() => services.filter((service) => selectedServices.includes(service.id)), [services, selectedServices]);
  const totalDuration = selectedServiceDetails.reduce((total, service) => total + Number(service.duration ?? service.duration_minutes ?? 0), 0);
  const totalPrice = selectedServiceDetails.reduce((total, service) => total + Number(service.price ?? 0), 0);
  const waitEstimate = isSupabaseConfigured ? data?.wait_minutes : Math.ceil(queuePreview.filter((entry) => entry.status === 'Waiting').reduce((sum, entry) => sum + 35, 0) / 3);

  function toggleService(serviceId) {
    setErrors((current) => ({ ...current, services: '' }));
    setSelectedServices((current) => {
      if (current.includes(serviceId)) return current.filter((id) => id !== serviceId);
      if (current.length >= 3) { notify('Choose up to three services for one queue visit.'); return current; }
      return [...current, serviceId];
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Enter your name to continue.';
    if (!/^\d{10}$/.test(phone)) nextErrors.phone = 'Enter a phone number with exactly 10 digits.';
    if (selectedServices.length < 1 || selectedServices.length > 3) nextErrors.services = 'Choose between one and three services.';
    if (selectedUnavailableBarber) nextErrors.barber = `${selectedUnavailableBarber.name} is on break or off duty. Choose Any barber or another available barber.`;
    if (!onlineOpen) nextErrors.queue = 'Online joining is closed. Walk-ins are still available through reception.';
    if (isSupabaseConfigured && services.length === 0) nextErrors.queue = 'No services are available yet. Please contact reception.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!isSupabaseConfigured) { notify('Sample preview only. Add Supabase settings to create a real queue entry.'); return; }
    setBusy(true);
    try {
      const result = await rpc('customer_join_queue', {
        p_customer_name: name.trim(), p_phone_number: phone,
        p_service_ids: selectedServices, p_preferred_barber_id: barber === 'any' ? null : barber,
      });
      if (result.already_active) {
        notify(`This phone number already has an active spot (${result.token}). Open My Status with your saved private link, or ask reception to locate it.`);
        return;
      }
      navigate(`/status/${result.access_token}`);
    } catch (submitError) {
      setErrors((current) => ({ ...current, queue: submitError.message }));
    } finally { setBusy(false); }
  }

  return (
    <div className="content-page join-page">
      <SectionHeading eyebrow="YOUR VISIT STARTS HERE" title="Join the queue" description="Share your details and choose the services you have in mind." action={<PreviewLabel>{isSupabaseConfigured ? (data ? 'Live data' : 'Connecting') : 'Sample preview'}</PreviewLabel>} />
      {connectionError && isSupabaseConfigured && <Panel className="connection-banner" role="status"><span>Could not load current salon details: {connectionError}</span><button className="text-link" type="button" onClick={reload}>Retry</button></Panel>}
      {isSupabaseConfigured && loading && !data && <Panel className="connection-banner" role="status">Loading the current service menu…</Panel>}
      <div className="join-layout">
        <form className="join-form" onSubmit={handleSubmit} noValidate>
          <Panel className="form-card">
            <div className="form-section-heading"><span>01</span><div><h2>Your details</h2><p>Your phone number prevents duplicate active queue entries.</p></div></div>
            <div className="field-grid">
              <label className="field">Name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} placeholder="How should we call you?" />{errors.name && <span className="field-error" id="name-error">{errors.name}</span>}</label>
              <label className="field">10-digit phone number<input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : 'phone-help'} placeholder="e.g. 9876543210" />{errors.phone ? <span className="field-error" id="phone-error">{errors.phone}</span> : <span className="field-help" id="phone-help">Numbers only, exactly 10 digits.</span>}</label>
            </div>
          </Panel>
          <Panel className="form-card">
            <div className="form-section-heading"><span>02</span><div><h2>Choose your services</h2><p>Select one to three. The totals update as you choose.</p></div></div>
            {errors.services && <p className="field-error form-error" role="alert">{errors.services}</p>}
            {services.length === 0 ? <div className="empty-message"><strong>No services are available</strong><p>Please check back with reception.</p></div> : <div className="service-choice-list">{services.filter((service) => service.enabled !== false).map((service) => {
              const checked = selectedServices.includes(service.id); const disabled = !checked && selectedServices.length >= 3;
              return <label className={`service-choice${checked ? ' checked' : ''}${disabled ? ' limit-reached' : ''}`} key={service.id}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleService(service.id)} /><span className="checkmark" aria-hidden="true">{checked ? '✓' : ''}</span><span className="service-choice-copy"><strong>{service.name}</strong><small>{service.description}</small></span><span className="service-choice-meta"><strong>{priceText(service.price, salon?.currency)}</strong><small>{service.duration ?? service.duration_minutes} min</small></span></label>;
            })}</div>}
            <p className="selection-count">{selectedServices.length} of 3 services selected</p>
          </Panel>
          <Panel className="form-card">
            <div className="form-section-heading"><span>03</span><div><h2>Choose your barber</h2><p>Choose a barber or ask for the soonest available chair.</p></div></div>
            <fieldset className="barber-choice-grid"><legend className="sr-only">Barber preference</legend>
              <label className={`barber-choice any-choice${barber === 'any' ? ' selected' : ''}`}><input type="radio" name="barber" value="any" checked={barber === 'any'} onChange={() => setBarber('any')} /><span className="barber-choice-icon">✧</span><span><strong>Any barber</strong><small>Fastest available</small></span><span className="choice-radio-mark" /></label>
              {availableBarbers.map((person) => <label className={`barber-choice${barber === person.id ? ' selected' : ''}`} key={person.id}><input type="radio" name="barber" value={person.id} checked={barber === person.id} onChange={() => setBarber(person.id)} /><span className="barber-avatar">{person.name.split(' ').map((word) => word[0]).slice(0,2).join('')}</span><span><strong>{person.name}</strong><small>{person.specialty} · Available</small></span><span className="choice-radio-mark" /></label>)}
              {barbers.filter((person) => person.on_duty !== false && (person.on_break || person.status === 'On break')).map((person) => <div className="barber-choice unavailable" key={person.id}><span className="barber-avatar">{person.name.split(' ').map((word) => word[0]).slice(0,2).join('')}</span><span><strong>{person.name}</strong><small>On break · unavailable for new requests</small></span><span className="status-badge muted">On break</span></div>)}
            </fieldset>
            {selectedUnavailableBarber && <p className="field-error" role="alert">{selectedUnavailableBarber.name} is on break or off duty. Choose Any barber or another available barber. Your preference has not been changed.</p>}
          </Panel>
          {(errors.queue || !onlineOpen) && <p className="queue-closed-message" role="alert">{errors.queue || 'Online joining is closed. Walk-ins are still available through reception.'}</p>}
          {!isSupabaseConfigured && <p className="field-help">Preview only: configure Supabase to submit and create a real entry.</p>}
          <button className="button button-gold full-button submit-join" type="submit" disabled={busy || !onlineOpen || (isSupabaseConfigured && !data)}>{busy ? 'Joining…' : onlineOpen ? (isSupabaseConfigured ? 'Confirm and join' : 'Preview queue details') : 'Online joining closed'} <span aria-hidden="true">↗</span></button>
          <p className="form-footnote">Already have a place? <Link to="/status">Open My Status with your private link</Link></p>
        </form>
        <aside className="join-summary-column" aria-label="Visit summary"><Panel className="join-summary"><PreviewLabel>{isSupabaseConfigured ? 'Live details' : 'Sample preview'}</PreviewLabel><p className="eyebrow summary-eyebrow">YOUR VISIT SUMMARY</p>{selectedServiceDetails.length ? <><strong className="summary-duration">{totalDuration} <span>minutes</span></strong><span className="summary-caption">of selected service time</span></> : <><strong className="summary-empty">Select a service</strong><span className="summary-caption">Your total appears here.</span></>}<div className="summary-breakdown"><div><span>Services</span><strong>{selectedServices.length} / 3</strong></div><div><span>Estimated wait</span><strong>{waitEstimate == null ? 'Unavailable' : `~${Math.ceil(waitEstimate)} min`}</strong></div><div className="summary-total"><span>{isSupabaseConfigured ? 'Total' : 'Sample total'}</span><strong>{priceText(totalPrice, salon?.currency)}</strong></div></div><p className="summary-disclaimer">Approximate wait based on service minutes ahead divided by barbers working; not a guaranteed appointment time.</p></Panel><Panel className="join-help"><span className="help-icon">i</span><div><strong>{isSupabaseConfigured ? 'Private status link' : 'This is a UI preview'}</strong><p>{isSupabaseConfigured ? 'Keep the next page link private. It grants access to this queue status.' : 'No customer details are sent or saved until Supabase is configured.'}</p></div></Panel></aside>
      </div>
      <FeedbackToast message={message} />
    </div>
  );
}

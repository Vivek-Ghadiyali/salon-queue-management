import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard.jsx';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { barbersPreview, formatPrice, queuePreview, salonPreview, servicesPreview } from '../data/previewData.js';
import useRealtimeRpc from '../hooks/useRealtimeRpc.js';
import { isSupabaseConfigured } from '../services/supabase.js';
import { uniqueServiceOptions } from '../utils/serviceOptions.js';

function formatSalonTime(value) {
  if (!value) return '—';
  if (/\b(?:AM|PM)\b/i.test(value)) return value;
  const [rawHours, minutes = '00'] = value.split(':');
  const hours = Number(rawHours);
  if (!Number.isFinite(hours)) return value;
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
}

export default function HomePage() {
  const { data, loading, error, reload } = useRealtimeRpc('get_public_salon_snapshot');
  const preview = !isSupabaseConfigured;
  const salon = data?.salon ?? (preview ? { ...salonPreview, online_open: salonPreview.onlineOpen } : null);
  const services = uniqueServiceOptions(data?.services ?? (preview ? servicesPreview : []));
  const barbers = data?.barbers ?? (preview ? barbersPreview.map((b) => ({ ...b, on_duty: b.onDuty, on_break: b.status === 'On break' })) : []);
  const waitingCount = data?.waiting_count ?? (preview ? queuePreview.filter((entry) => entry.status === 'Waiting').length : 0);
  const workingBarbers = barbers.filter((barber) => barber.on_duty && !barber.on_break).length;
  const estimatedWait = data?.wait_minutes ?? (preview && workingBarbers ? Math.ceil(servicesPreview.reduce((sum, service) => sum + service.duration, 0) * 3 / workingBarbers) : null);
  const onlineOpen = Boolean(salon?.online_open);
  const isBusy = !preview && loading && !data;
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const workingDays = salon?.working_days?.map((day) => dayNames[day - 1]).filter(Boolean).join(' · ') || salonPreview.days;
  const businessHours = salon?.opening_time && salon?.closing_time
    ? `${formatSalonTime(salon.opening_time)}–${formatSalonTime(salon.closing_time)} · ${workingDays}`
    : salon?.opening ?? 'Hours not configured';

  return (
    <div className="home-page">
      {error && !preview && <Panel className="connection-banner" role="status"><span>Could not refresh live salon information: {error}</span><button type="button" className="text-link" onClick={reload}>Retry</button></Panel>}
      {isBusy && <Panel className="connection-banner" role="status">Loading the live salon menu and queue…</Panel>}
      <div className="hero-grid">
        <div className="hero-copy"><PreviewLabel>{preview ? 'Sample preview' : 'Live salon details'}</PreviewLabel><p className="eyebrow hero-eyebrow"><span className="eyebrow-line" />{workingDays.toUpperCase()}</p><h1>A little time<br />for <em>yourself.</em></h1><p className="hero-description">A thoughtful salon experience starts before you take a seat. Explore the team and services, then join the queue.</p><div className="hero-actions">{onlineOpen ? <Link className="button button-gold" to="/join">Join the queue <span aria-hidden="true">↗</span></Link> : <button className="button button-gold" type="button" disabled aria-describedby="queue-closed-note">Join the queue <span aria-hidden="true">↗</span></button>}<a className="quiet-link" href="#services">Explore services <span aria-hidden="true">↓</span></a></div>{!onlineOpen && <p className="inline-note" id="queue-closed-note">Online joining is closed. Walk-ins may still be handled through reception.</p>}<div className="hero-open-state"><StatusBadge tone={onlineOpen ? 'green' : 'muted'}>{onlineOpen ? 'Online joining open' : 'Online joining closed'}</StatusBadge><span>{salon ? `Salon closes ${formatSalonTime(salon.closing_time ?? salon.closing)}` : 'Salon hours not configured'}</span></div><div className="hero-note"><span className="note-mark">✧</span><span>{salon?.address || (preview ? salonPreview.address : 'Address not configured')}<br /><small>{businessHours} · {salon?.timezone ?? 'Asia/Kolkata'}</small></span></div></div>
        <div className="hero-art" role="img" aria-label="Abstract warm salon interior illustration"><div className="art-orb" /><div className="art-arch"><div className="art-arch-inner" /></div><div className="art-plant plant-one">✦<br />│<br />╱ ╲</div><div className="art-plant plant-two">✧<br />│<br />╲ ╱</div><div className="art-caption"><span>ATELIER SALON</span><span>{preview ? 'SAMPLE PREVIEW' : 'SALON QUEUE'}</span></div></div>
      </div>
      <section className="today-section"><SectionHeading level={2} eyebrow="A MOMENT FOR YOU" title="Today at the salon" description={preview ? 'Sample queue details for layout preview only.' : 'Current queue information refreshes automatically.'} /><div className="metrics-grid"><MetricCard label="People waiting" value={String(waitingCount).padStart(2, '0')} detail={preview ? 'Sample queue · not live' : 'Current waiting queue'} icon="◷" /><MetricCard label="Approx. wait" value={estimatedWait == null ? '—' : `~${Math.ceil(estimatedWait)} min`} detail="Approximate · not a booking" icon="◷" /><MetricCard label="Barbers on the floor" value={`${workingBarbers} / ${barbers.length}`} detail={preview ? 'Sample availability' : 'Working now'} icon="✳" /></div>{waitingCount === 0 && <Panel className="home-empty-queue"><strong>No one waiting — walk right in!</strong><span>{preview ? 'Sample queue information, not a live count.' : 'There are no waiting customers right now.'}</span></Panel>}</section>
      <section className="home-section" id="services"><SectionHeading level={2} eyebrow="CONSIDERED CRAFT" title="Services, made personal" description={preview ? 'Sample menu for the customer journey preview.' : 'Choose up to three services when joining the queue.'} action={<Link className="text-link" to="/join">View queue form <span aria-hidden="true">↗</span></Link>} /><div className="service-grid home-service-grid">{services.filter((service) => service.enabled !== false).map((service, index) => <Panel className="home-service-card" key={service.id}><div className="service-card-top"><span className="service-index">{String(index + 1).padStart(2, '0')}</span><span className="service-category">{service.category}</span></div><h3>{service.name}</h3><p>{service.description}</p><div className="service-card-bottom"><span>{service.duration ?? service.duration_minutes} min</span><strong>{formatPrice(Number(service.price || 0))}</strong></div></Panel>)}</div>{!services.length && <Panel className="home-empty-queue"><strong>No services listed yet.</strong><span>Please check with reception.</span></Panel>}</section>
      <section className="barber-section"><div className="section-inline"><div><p className="eyebrow">THE PEOPLE BEHIND THE CHAIR</p><h2>Meet today’s team</h2></div><span className="muted-copy">{preview ? 'Sample team profiles' : 'Current availability'}</span></div><div className="barber-grid">{barbers.map((barber) => { const status = barber.status ?? (!barber.on_duty ? 'Off duty' : barber.on_break ? 'On break' : 'Available'); const tone = status === 'Available' ? 'green' : status === 'Busy' ? 'blue' : 'muted'; return <Panel key={barber.id} className="barber-card"><div className="barber-avatar">{barber.name.split(' ').map((part) => part[0]).slice(0,2).join('')}</div><div className="barber-info"><strong>{barber.name}</strong><span>{barber.specialty}</span></div><StatusBadge tone={tone}>{status}</StatusBadge></Panel>; })}</div></section>
      <div className="demo-notice">{preview ? 'Sample data only · queue, services and staff status are not connected.' : 'Salon queue information · refreshed automatically.'}</div>
    </div>
  );
}

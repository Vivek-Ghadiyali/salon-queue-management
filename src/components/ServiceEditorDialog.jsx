import { useState } from 'react';

export default function ServiceEditorDialog({ service, onClose, onSave }) {
  const [form, setForm] = useState({ name: service?.name ?? '', description: service?.description ?? '', category: service?.category ?? 'General', duration: service?.duration ?? 30, price: service?.price ?? 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return setError('Enter a service name.');
    if (Number(form.duration) <= 0) return setError('Duration must be more than zero minutes.');
    if (Number(form.price) < 0 || form.price === '') return setError('Enter a valid price.');
    setBusy(true); setError('');
    try { await onSave({ ...service, ...form, id: service?.id ?? null, duration: Number(form.duration), price: Number(form.price) }); }
    catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="service-editor-title"><span className="eyebrow">SERVICE MENU</span><h2 id="service-editor-title">{service ? 'Edit service' : 'Add a service'}</h2><p>Changes are saved to the salon service menu. Existing queue entries keep their saved service details.</p><form className="modal-form" onSubmit={submit} noValidate><label className="field">Service name<input required value={form.name} onChange={update('name')} autoFocus /></label><label className="field">Description<input value={form.description} onChange={update('description')} /></label><div className="field-grid"><label className="field">Category<input value={form.category} onChange={update('category')} /></label><label className="field">Duration in minutes<input type="number" min="1" max="600" value={form.duration} onChange={update('duration')} /></label></div><label className="field">Price (INR)<input type="number" min="0" step="1" value={form.price} onChange={update('price')} /></label>{error&&<p className="field-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Close</button><button type="submit" className="button button-gold" disabled={busy}>{busy?'Saving…':'Save service'}</button></div></form></section></div>;
}

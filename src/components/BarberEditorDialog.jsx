import { useState } from 'react';

export default function BarberEditorDialog({ barber, onClose, onSave }) {
  const [name, setName] = useState(barber?.name ?? '');
  const [specialty, setSpecialty] = useState(barber?.specialty ?? '');
  const [onDuty, setOnDuty] = useState(barber?.on_duty ?? true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) return setError('Enter a barber name.');
    setBusy(true); setError('');
    try { await onSave({ id: barber?.id ?? null, name: name.trim(), specialty: specialty.trim(), onDuty }); }
    catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target===event.currentTarget&&onClose()}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="barber-editor-title"><span className="eyebrow">SALON TEAM</span><h2 id="barber-editor-title">{barber?'Edit barber':'Add a barber'}</h2><form className="modal-form" onSubmit={submit}><label className="field">Barber name<input required value={name} onChange={(event)=>setName(event.target.value)}/></label><label className="field">Specialty<input value={specialty} onChange={(event)=>setSpecialty(event.target.value)}/></label><label className="settings-switch-row"><span className="settings-switch-copy"><strong>On duty</strong><small>Eligible for new assignments</small></span><input className="sr-only" type="checkbox" checked={onDuty} onChange={(event)=>setOnDuty(event.target.checked)}/><span className={`switch-control${onDuty?' is-on':''}`} aria-hidden="true"><span/></span></label>{error&&<p className="field-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Close</button><button type="submit" className="button button-gold" disabled={busy}>{busy?'Saving…':'Save barber'}</button></div></form></section></div>;
}

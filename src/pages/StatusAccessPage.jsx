import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Panel from '../components/Panel.jsx';
import PreviewLabel from '../components/PreviewLabel.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import { isSupabaseConfigured } from '../services/supabase.js';

function extractPrivateToken(value) {
  try {
    const parsed = new URL(value.trim(), window.location.origin);
    const match = parsed.pathname.match(/^\/status\/([a-f\d]{64})\/?$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export default function StatusAccessPage() {
  const navigate = useNavigate();
  const [privateLink, setPrivateLink] = useState('');
  const [error, setError] = useState('');

  function openStatus(event) {
    event.preventDefault();
    const token = extractPrivateToken(privateLink);
    if (!token) {
      setError('Paste the private status URL from your queue confirmation. Queue numbers such as S-14 are not private status links.');
      return;
    }
    navigate(`/status/${token}`);
  }

  return <div className="content-page status-page status-access-page">
    <SectionHeading eyebrow="CUSTOMER ACCESS" title="My Status" description="Reopen your queue progress with the private status link you received after joining." action={<PreviewLabel>{isSupabaseConfigured ? 'Private link required' : 'Sample preview'}</PreviewLabel>} />
    {isSupabaseConfigured ? <Panel className="status-access-panel"><form className="status-access-form" onSubmit={openStatus} noValidate><label className="field" htmlFor="private-status-link">Private status URL<input id="private-status-link" type="text" inputMode="url" autoComplete="url" spellCheck="false" value={privateLink} onChange={(event) => { setPrivateLink(event.target.value); setError(''); }} placeholder="https://your-salon.example/status/…" aria-invalid={Boolean(error)} aria-describedby={error ? 'private-status-error' : 'private-status-help'} /></label>{error ? <p className="field-error" id="private-status-error" role="alert">{error}</p> : <p className="field-help" id="private-status-help">Use the complete private link. A queue token by itself cannot open customer status.</p>}<button className="button button-gold" type="submit">Open my status <span aria-hidden="true">↗</span></button></form><p className="status-private-reminder">Your private link grants access to your status. Do not share it.</p></Panel> : <Panel className="status-access-panel"><strong>Sample status preview only</strong><p>This preview has no private customer links. Use the sample page to inspect the layout; in a connected salon, My Status requires the full private URL.</p><Link className="button button-outline" to="/status/S-15">Open sample status</Link></Panel>}
  </div>;
}

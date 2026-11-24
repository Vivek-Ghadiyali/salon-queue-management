import { useState } from 'react';
import FeedbackToast from './FeedbackToast.jsx';
import Panel from './Panel.jsx';
import PreviewLabel from './PreviewLabel.jsx';
import SectionHeading from './SectionHeading.jsx';
import { useStaffAuth } from '../contexts/StaffAuthContext.jsx';

export default function StaffGate({ title, description, roles, children }) {
  const { configured, loading, session, profile, error, signIn, signOut } = useStaffAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try { await signIn(email, password); }
    catch (signInError) { setFormError(signInError.message); }
    finally { setBusy(false); }
  }

  async function handleSignOut() {
    setActionError('');
    try { await signOut(); }
    catch (signOutError) { setActionError(signOutError.message); }
  }

  if (!configured) return <div className="content-page staff-gate-page"><SectionHeading eyebrow="SUPABASE SETUP REQUIRED" title={title} description={description} action={<PreviewLabel>Not connected</PreviewLabel>} /><Panel className="staff-gate-panel"><h2>Connect the Supabase project</h2><p>Add <code>VITE_SUPABASE_URL</code> and either <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> or <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart Vite. Staff screens use real records only.</p></Panel></div>;
  if (loading) return <div className="content-page staff-gate-page"><Panel className="staff-gate-panel"><p role="status">Checking staff session…</p></Panel></div>;
  if (!profile && session) return <div className="content-page staff-gate-page"><SectionHeading eyebrow="STAFF PROFILE REQUIRED" title={title} description="This account is signed in, but it is not linked to a salon staff profile." action={<PreviewLabel>Protected</PreviewLabel>} /><Panel className="staff-gate-panel"><h2>Ask the owner to link this account</h2><p>{error || 'Add this Auth user to public.staff_profiles with the correct role, then sign in again.'}</p>{actionError&&<p className="field-error" role="alert">{actionError}</p>}<button type="button" className="button button-outline" onClick={handleSignOut}>Sign out</button></Panel></div>;
  if (!profile) return <div className="content-page staff-gate-page"><SectionHeading eyebrow="STAFF SIGN IN" title={title} description={description} action={<PreviewLabel>Protected</PreviewLabel>} /><Panel className="staff-gate-panel"><h2>Sign in to continue</h2><p>Use the staff account created in Supabase Auth and linked to a staff profile.</p><form className="staff-login-form" onSubmit={submit}><label className="field">Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{(formError || error) && <p className="field-error" role="alert">{formError || error}</p>}<button className="button button-gold" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></Panel></div>;
  if (!roles.includes(profile.role)) return <div className="content-page staff-gate-page"><SectionHeading eyebrow="ACCESS RESTRICTED" title={title} description="This Supabase account does not have the role required for this screen." /><Panel className="staff-gate-panel"><p>Signed in as {profile.display_name || profile.role}. Contact the salon owner to update your staff profile.</p>{actionError&&<p className="field-error" role="alert">{actionError}</p>}<button type="button" className="button button-outline" onClick={handleSignOut}>Sign out</button></Panel></div>;
  return <><div className="content-page staff-session-bar"><span>Signed in · {profile.display_name || profile.role}</span><button type="button" className="text-link" onClick={handleSignOut}>Sign out</button>{actionError&&<span role="alert" className="field-error">{actionError}</span>}</div>{children}<FeedbackToast message={error} /></>;
}

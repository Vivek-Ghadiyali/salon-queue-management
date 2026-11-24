import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../services/supabase.js';

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const profileRequest = useRef(0);

  const loadProfile = useCallback(async (activeSession) => {
    const requestId = ++profileRequest.current;
    if (!activeSession || !supabase) {
      setProfile(null);
      setError('');
      return;
    }
    try {
      const { data, error: profileError } = await supabase.rpc('get_my_staff_profile');
      if (requestId !== profileRequest.current) return;
      if (profileError) {
        setProfile(null);
        setError(profileError.message);
      } else {
        setProfile(data);
        setError('');
      }
    } catch (profileError) {
      if (requestId !== profileRequest.current) return;
      setProfile(null);
      setError(profileError.message || 'Could not load the staff profile.');
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    }).catch((sessionError) => {
      if (!active) return;
      setError(sessionError.message || 'Could not check the staff session.');
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      profileRequest.current += 1;
      setProfile(null);
      setError('');
      if (!nextSession) {
        return;
      }
      window.setTimeout(() => { if (active) loadProfile(nextSession); }, 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    setError('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    setSession(data.session);
    await loadProfile(data.session);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, profile, loading, error, signIn, signOut, configured: isSupabaseConfigured }), [session, profile, loading, error, signIn, signOut]);
  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (!context) throw new Error('useStaffAuth must be used inside StaffAuthProvider.');
  return context;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../services/supabase.js';
import { rpc, subscribeToSalonRefresh } from '../services/salonApi.js';

export default function useRealtimeRpc(name, params = {}, { enabled = true, interval = 4000 } = {}) {
  const argsKey = JSON.stringify(params);
  const argsRef = useRef(params);
  argsRef.current = params;
  const [data, setData] = useState(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [loading, setLoading] = useState(enabled && isSupabaseConfigured);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState(isSupabaseConfigured ? 'connecting' : 'preview');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const reload = useCallback(async (quiet = false) => {
    if (!enabled || !isSupabaseConfigured) {
      setLoading(false);
      return null;
    }
    if (!quiet) setLoading(true);
    try {
      const result = await rpc(name, argsRef.current);
      setData(result);
      setLoadedKey(argsKey);
      setError('');
      setLastUpdatedAt(Date.now());
      return result;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [argsKey, enabled, name]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) {
      setLoading(false);
      setRealtimeStatus('preview');
      return undefined;
    }
    let active = true;
    setRealtimeStatus('connecting');
    const run = async (quiet = false) => {
      if (!active) return;
      await reload(quiet);
    };
    run();
    const timer = window.setInterval(() => run(true), interval);
    const unsubscribe = subscribeToSalonRefresh(
      () => run(true),
      (status) => {
        if (!active) return;
        setRealtimeStatus(status === 'SUBSCRIBED' ? 'connected' : 'reconnecting');
      },
    );
    return () => {
      active = false;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [argsKey, enabled, interval, reload]);

  return {
    data: loadedKey === argsKey ? data : null,
    loading: loading || (enabled && isSupabaseConfigured && loadedKey !== argsKey),
    error,
    realtimeStatus,
    lastUpdatedAt,
    reload: () => reload(false),
    setData,
  };
}

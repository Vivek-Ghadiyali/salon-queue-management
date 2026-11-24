import { isSupabaseConfigured, supabase } from './supabase.js';

export class SalonApiError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.name = 'SalonApiError';
    this.code = code;
  }
}

export async function rpc(name, params = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new SalonApiError('Supabase is not configured. Add the project URL and anon key to .env.local.', 'NOT_CONFIGURED');
  }
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new SalonApiError(error.message, error.code ?? 'RPC_ERROR');
  return data;
}

export function subscribeToSalonRefresh(onRefresh, onStatus = () => {}) {
  if (!isSupabaseConfigured || !supabase) return () => {};
  let active = true;
  const channel = supabase.channel('salon-queue')
    .on('broadcast', { event: 'refresh' }, onRefresh)
    .subscribe((status, error) => {
      if (active) onStatus(status, error);
    });
  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export function displayQueueStatus(value) {
  return ({ waiting: 'Waiting', called: 'Called', in_chair: 'In Chair', done: 'Done', cancelled: 'Cancelled', no_show: 'No-show' })[value] ?? value;
}

export function friendlyError(error) {
  if (error?.code === 'NOT_CONFIGURED') return error.message;
  const text = error?.message ?? 'The request could not be completed. Check the connection and try again.';
  return text.replace(/^Error:\s*/i, '');
}

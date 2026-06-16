// Supabase client initialization & dynamic syncing layer
import { createClient } from '@supabase/supabase-js';

const KEYS = {
  SB_URL: 'accountability_supabase_url',
  SB_KEY: 'accountability_supabase_key',
};

export function getSupabaseConfig() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    return { url: url.trim(), key: key.trim() };
  } catch {
    return { url: '', key: '' };
  }
}

export function saveSupabaseConfig(url, key) {
  try {
    localStorage.setItem(KEYS.SB_URL, url.trim());
    localStorage.setItem(KEYS.SB_KEY, key.trim());
    initializeSupabase();
  } catch (e) {
    console.warn('Failed to save Supabase config to localStorage:', e);
  }
}

export function clearSupabaseConfig() {
  try {
    localStorage.removeItem(KEYS.SB_URL);
    localStorage.removeItem(KEYS.SB_KEY);
    supabase = null;
    notifyListeners('offline');
  } catch (e) {
    console.warn('Failed to clear Supabase config from localStorage:', e);
  }
}

export let supabase = null;
let syncListeners = [];

export function addSyncListener(listener) {
  syncListeners.push(listener);
  // Initial state trigger
  listener(supabase ? 'saved' : 'offline');
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifyListeners(status) {
  syncListeners.forEach((l) => {
    try {
      l(status);
    } catch (err) {
      // Ignore listener error
    }
  });
}

export function initializeSupabase() {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    try {
      supabase = createClient(url, key);
      notifyListeners('saved');
      return true;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      supabase = null;
      notifyListeners('offline');
      return false;
    }
  } else {
    supabase = null;
    notifyListeners('offline');
    return false;
  }
}

// Test credentials connection
export async function testConnection(url, key) {
  try {
    const testClient = createClient(url, key);
    // Do a quick, light check
    const { error } = await testClient
      .from('daily_history')
      .select('score')
      .limit(1);
    
    // PGRST116 is normal (empty table), auth / key errors mean connection failed
    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        // Table daily_history might not exist yet, but credentials connected
        return true;
      }
      if (error.message?.includes('API key') || error.message?.includes('JWT') || error.status === 401 || error.status === 403) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Sync daily aggregates
export async function syncDayToSupabase(dayData) {
  if (!supabase) {
    notifyListeners('offline');
    return;
  }
  notifyListeners('syncing');
  try {
    const { error } = await supabase
      .from('daily_history')
      .upsert({
        user_id: 'default',
        date: dayData.date,
        score: dayData.score || 0,
        work_minutes: dayData.workMinutes || 0,
        wasted_minutes: dayData.wastedMinutes || 0,
        habits: dayData.habits || {},
        schedule_completion: dayData.scheduleCompletion || 0,
        notes: dayData.notes || '',
        energy_logs: dayData.energyLogs || [],
        sleep_data: dayData.sleepData || null,
        sessions: dayData.sessions || [],
      }, { onConflict: 'user_id,date' });
    
    if (error) {
      console.warn('Supabase sync error:', error);
      notifyListeners('error');
    } else {
      notifyListeners('saved');
    }
  } catch (e) {
    console.warn('Supabase sync exception:', e);
    notifyListeners('error');
  }
}

// Sync completed timer sessions
export async function syncSessionToSupabase(session) {
  if (!supabase) {
    notifyListeners('offline');
    return;
  }
  notifyListeners('syncing');
  try {
    const { error } = await supabase
      .from('timer_sessions')
      .insert({
        user_id: 'default',
        date: session.date,
        project: session.project || 'Untagged',
        start_time: session.startTime,
        end_time: session.endTime,
        duration_minutes: session.durationMinutes || 0,
        gaps: session.gaps || [],
      });
    
    if (error) {
      console.warn('Session sync error:', error);
      notifyListeners('error');
    } else {
      notifyListeners('saved');
    }
  } catch (e) {
    console.warn('Session sync exception:', e);
    notifyListeners('error');
  }
}

// Pull history from database
export async function fetchHistory() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('daily_history')
      .select('*')
      .eq('user_id', 'default')
      .order('date', { ascending: false })
      .limit(365);
    
    if (error) throw error;
    return (data || []).map((row) => ({
      date: row.date,
      score: row.score,
      workMinutes: row.work_minutes,
      wastedMinutes: row.wasted_minutes,
      habits: row.habits,
      scheduleCompletion: row.schedule_completion,
      notes: row.notes,
      energyLogs: row.energy_logs,
      sleepData: row.sleep_data,
      sessions: row.sessions,
    }));
  } catch (e) {
    console.warn('Supabase fetch failed:', e);
    return [];
  }
}

// Sync settings (profile) to user_settings table
export async function syncSettingsToSupabase(profile) {
  if (!supabase) {
    notifyListeners('offline');
    return;
  }
  notifyListeners('syncing');
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: 'default',
        settings: profile,
        updated_at: profile.updatedAt || new Date().toISOString(),
      }, { onConflict: 'user_id' });
    
    if (error) {
      console.warn('Settings sync error:', error);
      notifyListeners('error');
    } else {
      notifyListeners('saved');
    }
  } catch (e) {
    console.warn('Settings sync exception:', e);
    notifyListeners('error');
  }
}

// Fetch settings (profile) from user_settings table
export async function fetchSettingsFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', 'default')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data ? { ...data.settings, updatedAt: data.updated_at } : null;
  } catch (e) {
    console.warn('Supabase settings fetch failed:', e);
    return null;
  }
}

// Batch sync all data to Supabase (usually called when transitioning from offline to online)
export async function syncQueueToSupabase(history, profile) {
  if (!supabase) return;
  notifyListeners('syncing');
  try {
    if (profile) {
      await syncSettingsToSupabase(profile);
    }
    if (history && history.length > 0) {
      for (const day of history.slice(0, 30)) {
        await syncDayToSupabase(day);
      }
    }
    notifyListeners('saved');
  } catch (e) {
    console.warn('Batch sync failed:', e);
    notifyListeners('error');
  }
}

// Initialize client on file load
initializeSupabase();

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './tabs/Dashboard';
import TimerTab from './tabs/Timer';
import SleepHealth from './tabs/SleepHealth';
import Analytics from './tabs/Analytics';
import Planner from './tabs/Planner';
import SettingsTab from './tabs/Settings';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTimer } from './hooks/useTimer';
import { useDailyReset } from './hooks/useDailyReset';
import { useNotifications } from './hooks/useNotifications';
import { calculateDailyScore } from './lib/score';
import { KEYS, loadData, saveData } from './lib/storage';
import { DEFAULT_PROFILE, DEFAULT_SCHEDULE, DEFAULT_REMINDERS, createDaySummary } from './data/defaults';
import { addSyncListener, syncDayToSupabase, syncSessionToSupabase, syncSettingsToSupabase, fetchSettingsFromSupabase, syncQueueToSupabase } from './lib/supabase';
import { Cloud, CloudLightning, CloudOff, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useLocalStorage(KEYS.PROFILE, DEFAULT_PROFILE);
  const [todayData, setTodayData] = useState({
    date: new Date().toISOString().split('T')[0],
    schedule: [],
    reminders: [],
    customReminders: [],
    habits: { grooming: false, medicine: false },
    hydration: 0,
    sleepLogged: false,
    sleepData: null,
    energyLogs: [],
    wastedTime: [],
    wastedMinutes: 0,
    workMinutes: 0,
    sessions: [],
    tomorrowPlanned: false,
    notes: '',
    score: 0,
  });
  const [projects, setProjects] = useLocalStorage(KEYS.PROJECTS, ['Study', 'Work', 'Side Project']);
  const [syncStatus, setSyncStatus] = useState('offline'); // offline | syncing | saved | error

  // Daily reset + archive
  useDailyReset(todayData, setTodayData, profile);

  // Notifications
  useNotifications(profile, todayData);

  // Monitor Supabase status
  useEffect(() => {
    return addSyncListener((status) => {
      setSyncStatus(status);
    });
  }, []);

  // Ensure new settings fields exist in loaded profile & clear old defaults
  useEffect(() => {
    let changed = false;
    const updated = { ...profile };

    // Clear old default schedule/reminders if they are present in local storage
    const hasOldScheduleDefaults = updated.schedule?.some(item => ['s1', 's2', 's3', 's4'].includes(item.id));
    const hasOldReminderDefaults = updated.reminders?.some(item => ['r1', 'r2', 'r3', 'r4'].includes(item.id));

    if (hasOldScheduleDefaults) {
      updated.schedule = [];
      changed = true;
    }
    if (hasOldReminderDefaults) {
      updated.reminders = [];
      changed = true;
    }

    if (updated.reminders === undefined || updated.reminders === null) {
      updated.reminders = [];
      changed = true;
    }
    if (updated.schedule === undefined || updated.schedule === null) {
      updated.schedule = [];
      changed = true;
    }
    if (updated.pomodoroWorkMinutes === undefined) {
      updated.pomodoroWorkMinutes = 25;
      changed = true;
    }
    if (updated.pomodoroBreakMinutes === undefined) {
      updated.pomodoroBreakMinutes = 5;
      changed = true;
    }
    if (!updated.updatedAt) {
      updated.updatedAt = new Date().toISOString();
      changed = true;
    }
    if (changed) {
      setProfile(updated);
      saveData(KEYS.PROFILE, updated);

      // Also clear today's agenda if it contains the old default schedule or reminders
      setTodayData(prev => {
        const todayUpdated = {
          ...prev,
          schedule: hasOldScheduleDefaults ? [] : prev.schedule,
          reminders: hasOldReminderDefaults ? [] : prev.reminders,
        };
        saveData(KEYS.TODAY, todayUpdated);
        return todayUpdated;
      });
    }
  }, []);

  // Reconcile settings with Supabase on mount
  useEffect(() => {
    const initSync = async () => {
      if (navigator.onLine) {
        try {
          const cloudSettings = await fetchSettingsFromSupabase();
          if (cloudSettings) {
            const local = loadData(KEYS.PROFILE) || profile;
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const cloudTime = cloudSettings.updatedAt ? new Date(cloudSettings.updatedAt).getTime() : 0;
            if (cloudTime > localTime) {
              setProfile(cloudSettings);
            } else if (localTime > cloudTime) {
              await syncSettingsToSupabase(local);
            }
          } else {
            await syncSettingsToSupabase(profile);
          }
        } catch (e) {
          console.warn('Initial settings sync failed:', e);
        }
      }
    };
    initSync();
  }, []);

  // Reconnection listener
  useEffect(() => {
    const handleOnline = () => {
      const history = loadData(KEYS.HISTORY) || [];
      const currentProfile = loadData(KEYS.PROFILE) || profile;
      syncQueueToSupabase(history, currentProfile);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [profile]);

  // Sync profile settings to Supabase when it changes
  const profileSyncTimeoutRef = useRef(null);
  useEffect(() => {
    if (profile) {
      if (profileSyncTimeoutRef.current) clearTimeout(profileSyncTimeoutRef.current);
      profileSyncTimeoutRef.current = setTimeout(() => {
        syncSettingsToSupabase(profile);
      }, 2000);
    }
    return () => {
      if (profileSyncTimeoutRef.current) clearTimeout(profileSyncTimeoutRef.current);
    };
  }, [profile]);

  // Sync today's data to Supabase (debounced to avoid multiple requests)
  const syncTimeoutRef = useRef(null);
  const triggerCloudSync = useCallback((data) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      const summary = createDaySummary(data);
      syncDayToSupabase(summary);
    }, 1500); // 1.5s debounce
  }, []);

  // Clear today data sync timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  // Save today data on every change & sync
  useEffect(() => {
    if (todayData && todayData.date) {
      const scoreResult = calculateDailyScore(todayData, profile);
      const withScore = { ...todayData, score: scoreResult.score };
      saveData(KEYS.TODAY, withScore);
      if (withScore.score !== todayData.score) {
        setTodayData(withScore);
      }
      triggerCloudSync(withScore);
    }
  }, [todayData, profile, triggerCloudSync]);

  // Timer session sync callback
  const handleSessionEnd = useCallback((session) => {
    setTodayData((prev) => {
      const sessions = [...(prev.sessions || []), session];
      const workMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || s.durationSeconds / 60 || 0), 0);
      const updated = { ...prev, sessions, workMinutes: Math.round(workMinutes) };
      // Sync session to cloud
      syncSessionToSupabase(session);
      return updated;
    });
  }, []);

  const timer = useTimer(handleSessionEnd, profile);

  // Apply theme on load
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'focus-mode');
    if (profile.theme === 'dark') document.documentElement.classList.add('dark');
    if (profile.theme === 'focus') document.documentElement.classList.add('focus-mode');
  }, [profile.theme]);

  // Focus mode override
  const isFocusMode = profile.theme === 'focus' && activeTab !== 'settings';

  if (isFocusMode) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 transition-colors">
        <div className="max-w-md w-full">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-bold tracking-widest uppercase text-text-muted">Focus Period</span>
            <button
              onClick={() => {
                setProfile((prev) => ({ ...prev, theme: 'light' }));
                document.documentElement.classList.remove('focus-mode');
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              Exit Focus
            </button>
          </div>
          <TimerTab
            timer={timer}
            todayData={todayData}
            setTodayData={setTodayData}
            profile={profile}
            projects={projects}
            setProjects={setProjects}
          />
        </div>
      </div>
    );
  }

  // Active tab title for breadcrumbs
  const tabTitles = {
    dashboard: 'Dashboard',
    timer: 'Timer',
    sleep: 'Sleep & Health',
    analytics: 'Analytics & Heatmap',
    planner: 'Schedule Planner',
    settings: 'Settings',
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors flex flex-col md:flex-row p-0 md:p-4 gap-0 md:gap-6">
      {/* Navigation Side Panel / Bottom Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0 px-4 md:px-0 py-6 md:py-4 pb-24 md:pb-4 max-w-page mx-auto w-full">
        {/* Top Header Bar with Breadcrumb and Cloud Status */}
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-divider">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-0.5">Schedule Tracker</span>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">{tabTitles[activeTab]}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Supabase Sync Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-medium text-text-secondary select-none">
              {syncStatus === 'syncing' && (
                <>
                  <RefreshCw size={12} className="animate-spin text-neutral-500" />
                  <span>Syncing...</span>
                </>
              )}
              {syncStatus === 'saved' && (
                <>
                  <Cloud size={12} className="text-neutral-800 dark:text-neutral-200" />
                  <span>Saved to Cloud</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <CloudLightning size={12} className="text-red-500" />
                  <span className="text-red-500">Sync Error</span>
                </>
              )}
              {syncStatus === 'offline' && (
                <>
                  <CloudOff size={12} className="text-text-muted" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {/* Profile Avatar Initials */}
            <div 
              onClick={() => setActiveTab('settings')}
              className="w-8 h-8 rounded-full border border-border bg-surface hover:border-text-primary transition-all flex items-center justify-center text-[11px] font-bold text-text-primary cursor-pointer select-none"
            >
              {profile.avatarInitials || profile.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Content Render Grid */}
        <main className="flex-1">
          {activeTab === 'dashboard' && (
            <Dashboard todayData={todayData} setTodayData={setTodayData} profile={profile} />
          )}
          {activeTab === 'timer' && (
            <TimerTab
              timer={timer}
              todayData={todayData}
              setTodayData={setTodayData}
              profile={profile}
              projects={projects}
              setProjects={setProjects}
            />
          )}
          {activeTab === 'sleep' && (
            <SleepHealth todayData={todayData} setTodayData={setTodayData} profile={profile} />
          )}
          {activeTab === 'analytics' && (
            <Analytics todayData={todayData} profile={profile} />
          )}
          {activeTab === 'planner' && (
            <Planner todayData={todayData} setTodayData={setTodayData} profile={profile} setProfile={setProfile} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab profile={profile} setProfile={setProfile} todayData={todayData} setTodayData={setTodayData} />
          )}
        </main>
      </div>
    </div>
  );
}

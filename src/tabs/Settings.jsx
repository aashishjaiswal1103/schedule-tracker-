import React, { useState, useEffect } from 'react';
import { User, Sun, Moon, Clock, Target, Palette, Bell, Database, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Download, AlertTriangle, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Card, CardLabel, SectionLabel, Button, Input, Select, Chip, Divider } from '../components/UI';
import Modal from '../components/Modal';
import { generateId } from '../lib/utils';
import { exportAllData, downloadJSON, clearAllData, KEYS, saveData } from '../lib/storage';
import { requestNotificationPermission } from '../lib/notifications';
import { DEFAULT_CATEGORIES, createTodayData } from '../data/defaults';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, testConnection } from '../lib/supabase';

export default function SettingsTab({ profile, setProfile, todayData, setTodayData }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [newCategory, setNewCategory] = useState({ label: '', color: '#171717' });
  const [newBlock, setNewBlock] = useState({ time: '09:00', label: '', category: 'deep-work', recurring: 'daily' });

  // Supabase State
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const [testStatus, setTestStatus] = useState('idle'); // idle | testing | success | error

  const allCategories = [...DEFAULT_CATEGORIES, ...(profile.customCategories || [])];

  // Load Supabase credentials on mount
  useEffect(() => {
    const config = getSupabaseConfig();
    setDbUrl(config.url || '');
    setDbKey(config.key || '');
  }, []);

  const handleTestAndConnect = async () => {
    if (!dbUrl.trim() || !dbKey.trim()) {
      alert("Please fill in both the Supabase URL and Anon Key.");
      return;
    }
    setTestStatus('testing');
    const connected = await testConnection(dbUrl.trim(), dbKey.trim());
    if (connected) {
      saveSupabaseConfig(dbUrl.trim(), dbKey.trim());
      setTestStatus('success');
    } else {
      setTestStatus('error');
    }
  };

  const handleDisconnect = () => {
    if (confirm("Disconnect database? Local data will remain intact, but online syncing will stop.")) {
      clearSupabaseConfig();
      setDbUrl('');
      setDbKey('');
      setTestStatus('idle');
    }
  };

  const updateProfile = (key, value) => {
    setProfile((prev) => {
      const updated = { ...prev, [key]: value };
      saveData(KEYS.PROFILE, updated);
      return updated;
    });
  };

  const updateNotification = (key, value) => {
    setProfile((prev) => {
      const updated = { ...prev, notifications: { ...prev.notifications, [key]: value } };
      saveData(KEYS.PROFILE, updated);
      return updated;
    });
  };

  // Schedule management
  const addScheduleBlock = () => {
    if (!newBlock.label.trim()) return;
    const block = { ...newBlock, id: generateId(), completed: false, note: '' };
    const schedule = [...(profile.schedule || []), block].sort((a, b) => a.time.localeCompare(b.time));
    updateProfile('schedule', schedule);
    setNewBlock({ time: '09:00', label: '', category: 'deep-work', recurring: 'daily' });
  };

  const removeScheduleBlock = (id) => {
    const schedule = (profile.schedule || []).filter((b) => b.id !== id);
    updateProfile('schedule', schedule);
  };

  const moveScheduleBlock = (index, direction) => {
    const schedule = [...(profile.schedule || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= schedule.length) return;
    [schedule[index], schedule[newIndex]] = [schedule[newIndex], schedule[index]];
    updateProfile('schedule', schedule);
  };

  // Custom categories
  const addCategory = () => {
    if (!newCategory.label.trim()) return;
    const cat = { id: generateId(), ...newCategory };
    updateProfile('customCategories', [...(profile.customCategories || []), cat]);
    setNewCategory({ label: '', color: '#171717' });
  };

  const removeCategory = (id) => {
    updateProfile('customCategories', (profile.customCategories || []).filter((c) => c.id !== id));
  };

  // Theme
  const setTheme = (theme) => {
    updateProfile('theme', theme);
    document.documentElement.classList.remove('dark', 'focus-mode');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    if (theme === 'focus') document.documentElement.classList.add('focus-mode');
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Supabase Cloud Sync Settings */}
      <div>
        <SectionLabel>Database Connection (Supabase)</SectionLabel>
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Database size={18} className="text-black dark:text-white" />
            <div>
              <h4 className="text-sm font-bold">Cloud Sync Settings</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Link to your own Supabase database to save scores, sleep logs, and sessions permanently.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <CardLabel>Supabase Project URL</CardLabel>
              <Input
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <CardLabel>Supabase Anon Key</CardLabel>
              <Input
                type="password"
                value={dbKey}
                onChange={(e) => setDbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          {/* Test Status feedback */}
          {testStatus === 'testing' && (
            <div className="text-xs font-semibold text-neutral-600 flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin" /> Verifying credentials...
            </div>
          )}
          {testStatus === 'success' && (
            <div className="text-xs font-bold text-black dark:text-white flex items-center gap-2">
              <Cloud size={14} /> Database Connected & Syncing!
            </div>
          )}
          {testStatus === 'error' && (
            <div className="text-xs font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle size={14} /> Verification failed. Check credentials or tables.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleTestAndConnect}
              disabled={testStatus === 'testing'}
              className="flex-1 py-3 text-xs bg-black text-white hover:bg-neutral-800 font-bold"
            >
              Test & Connect
            </Button>
            {(getSupabaseConfig().url) && (
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                className="py-3 text-xs font-bold border-red-200 text-red-500 hover:bg-red-50"
              >
                Disconnect
              </Button>
            )}
          </div>

          <Divider />
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl p-4 space-y-2">
            <CardLabel>SETUP INSTRUCTIONS</CardLabel>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              1. Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-black dark:text-white">supabase.com</a>.
            </p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              2. Open the **SQL Editor** in your Supabase dashboard and run the schema queries located in the <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">supabase_schema.sql</code> file at the root of this project.
            </p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              3. Retrieve the **Project URL** and **Anon API Key** from Settings → API, copy-paste them above, and click Connect!
            </p>
          </div>
        </Card>
      </div>

      {/* 2. User Profile */}
      <div>
        <SectionLabel>User Profile</SectionLabel>
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-xl text-black dark:text-white select-none">
              {profile.avatarInitials || profile.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <CardLabel>Profile Name</CardLabel>
                <Input
                  value={profile.name || ''}
                  onChange={(e) => updateProfile('name', e.target.value)}
                  placeholder="Your Name"
                  className="mt-1"
                />
              </div>
              <div>
                <CardLabel>Avatar Initials</CardLabel>
                <Input
                  value={profile.avatarInitials || ''}
                  onChange={(e) => updateProfile('avatarInitials', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="AB"
                  className="mt-1 w-24"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Goals & Times */}
      <div>
        <SectionLabel>Routines & Goals</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <CardLabel>Morning Wake Time</CardLabel>
            <Input type="time" value={profile.wakeTime || '06:30'} onChange={(e) => updateProfile('wakeTime', e.target.value)} className="mt-1" />
          </Card>
          <Card className="p-5">
            <CardLabel>Sleep Target Time</CardLabel>
            <Input type="time" value={profile.sleepTargetTime || '22:30'} onChange={(e) => updateProfile('sleepTargetTime', e.target.value)} className="mt-1" />
          </Card>
          <Card className="p-5">
            <CardLabel>Sleep Duration Target (hours)</CardLabel>
            <Input type="number" min="4" max="12" step="0.5" value={profile.sleepTargetHours || 7.5} onChange={(e) => updateProfile('sleepTargetHours', parseFloat(e.target.value))} className="mt-1" />
          </Card>
          <Card className="p-5">
            <CardLabel>Daily Focus Goal (hours)</CardLabel>
            <Input type="number" min="1" max="16" step="0.5" value={profile.dailyWorkHourGoal || 8} onChange={(e) => updateProfile('dailyWorkHourGoal', parseFloat(e.target.value))} className="mt-1" />
          </Card>
          <Card className="p-5">
            <CardLabel>Weekly Focus Goal (hours)</CardLabel>
            <Input type="number" min="1" max="120" step="1" value={profile.weeklyWorkHourGoal || 50} onChange={(e) => updateProfile('weeklyWorkHourGoal', parseFloat(e.target.value))} className="mt-1" />
          </Card>
          <Card className="p-5">
            <CardLabel>Hydration Target (glasses)</CardLabel>
            <Input type="number" min="1" max="20" value={profile.hydrationGoal || 8} onChange={(e) => updateProfile('hydrationGoal', parseInt(e.target.value))} className="mt-1" />
          </Card>
          <Card className="p-5 col-span-1 sm:col-span-2">
            <CardLabel>Screen Curfew (Device winds down)</CardLabel>
            <Input type="time" value={profile.screenCurfewTime || '22:00'} onChange={(e) => updateProfile('screenCurfewTime', e.target.value)} className="mt-1" />
          </Card>
        </div>
      </div>

      {/* 4. Default Schedule Builder Redirect */}
      <div>
        <SectionLabel>Routine Schedule Template</SectionLabel>
        <Card className="p-6 text-center space-y-3">
          <Clock className="mx-auto text-text-secondary w-8 h-8" />
          <h4 className="text-sm font-bold">Manage Routine Template in Planner</h4>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            You can now customize your default routines, scheduled reminders, and Pomodoro timer intervals directly inside the **Planner** tab.
          </p>
        </Card>
      </div>

      {/* 5. Custom Categories */}
      <div>
        <SectionLabel>Custom category tags</SectionLabel>
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            {allCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 border border-border bg-neutral-50 dark:bg-neutral-900 rounded-xl py-1.5 px-3">
                <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-semibold text-text-primary">{cat.label}</span>
                {(profile.customCategories || []).find((c) => c.id === cat.id) && (
                  <button onClick={() => removeCategory(cat.id)} className="text-text-muted hover:text-red-500 ml-1">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-divider">
            <Input value={newCategory.label} onChange={(e) => setNewCategory((c) => ({ ...c, label: e.target.value }))} placeholder="New Category Name" className="flex-1" />
            <input type="color" value={newCategory.color} onChange={(e) => setNewCategory((c) => ({ ...c, color: e.target.value }))} className="w-10 h-10 rounded-xl cursor-pointer border-0 shrink-0 p-0" />
            <Button onClick={addCategory} className="bg-black text-white hover:bg-neutral-800 font-bold" size="sm">Add Tag</Button>
          </div>
        </Card>
      </div>

      {/* 6. Dashboard Theme */}
      <div>
        <SectionLabel>Aesthetic Theme</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'light', label: 'Monochrome Light', icon: Sun },
            { id: 'dark', label: 'Monochrome Dark', icon: Moon },
            { id: 'focus', label: 'Clean Focus', icon: Target },
          ].map((theme) => {
            const Icon = theme.icon;
            const isActive = (profile.theme || 'light') === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-card border-2 transition-all duration-150 active:scale-95
                  ${isActive 
                    ? 'border-black bg-neutral-100 dark:border-white dark:bg-neutral-900' 
                    : 'border-border hover:border-neutral-400 bg-surface'}`}
              >
                <Icon size={24} className="text-black dark:text-white" />
                <span className="text-xs font-bold text-text-primary">{theme.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Push Notifications */}
      <div>
        <SectionLabel>Reminders & Alerts</SectionLabel>
        <Card className="p-6 space-y-4">
          <Button variant="secondary" onClick={requestNotificationPermission} className="w-full font-bold" size="sm">
            <Bell size={14} /> Request System Permission
          </Button>
          <div className="space-y-3 pt-2">
            {[
              { key: 'medicine', label: 'Medicine check-ins' },
              { key: 'grooming', label: 'Morning grooming reminders' },
              { key: 'water', label: 'Hydration water alerts' },
              { key: 'sessionStartEnd', label: 'Focus timers boundaries' },
              { key: 'curfew', label: 'Bedtime curfews banner' },
              { key: 'morningBriefing', label: 'Morning statistics briefing' },
              { key: 'endOfDay', label: 'Night reflection reviews' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1.5 border-b border-divider last:border-none">
                <span className="text-[13px] font-semibold text-text-primary">{label}</span>
                <button
                  onClick={() => updateNotification(key, !(profile.notifications?.[key] ?? true))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 outline-none
                    ${profile.notifications?.[key] !== false ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-black transition-transform duration-200
                    ${profile.notifications?.[key] !== false ? 'translate-x-5' : 'translate-x-0.5'}`} 
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 8. Data Storage Cleanups */}
      <div>
        <SectionLabel>Reset & Data Controls</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button variant="secondary" className="py-4 text-xs font-bold" onClick={() => {
            const data = exportAllData();
            downloadJSON(data);
          }}>
            <Download size={14} /> Export Data as JSON
          </Button>
          <Button variant="destructive" className="py-4 text-xs font-bold" onClick={() => setShowClearConfirm(true)}>
            Reset Today's Progress
          </Button>
          <Button variant="destructive" className="py-4 text-xs font-bold border-red-200 text-red-500 hover:bg-red-50" onClick={() => setShowClearAllConfirm(true)}>
            <AlertTriangle size={14} /> Permanent Factory Wipe
          </Button>
        </div>
      </div>

      {/* Clear today confirm modal */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Reset Today's Log?">
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          This will wipe all of today's check-ins, logged sessions, hydration count, and reset score. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="destructive" className="bg-red-500 text-white font-bold" onClick={() => {
            const fresh = createTodayData(todayData.date, profile.schedule || []);
            setTodayData(fresh);
            saveData(KEYS.TODAY, fresh);
            setShowClearConfirm(false);
          }}>Confirm Reset</Button>
          <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* Clear all confirm modal */}
      <Modal isOpen={showClearAllConfirm} onClose={() => setShowClearAllConfirm(false)} title="⚠️ Permanent Factory Wipe?">
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          This will wipe all historical data, custom settings, database links, and profile details permanently. The app will reload fresh.
        </p>
        <div className="flex gap-2">
          <Button variant="destructive" className="bg-red-500 text-white font-bold" onClick={() => {
            clearAllData();
            window.location.reload();
          }}>Wipe Everything</Button>
          <Button variant="secondary" onClick={() => setShowClearAllConfirm(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}

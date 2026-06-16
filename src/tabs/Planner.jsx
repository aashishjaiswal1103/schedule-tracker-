import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, BookOpen, 
  Calendar, Clock, Bell, Settings, RefreshCw, CheckSquare, Square, 
  Database, AlertCircle, Sparkles
} from 'lucide-react';
import { Card, CardLabel, SectionLabel, Button, Input, Select, Chip, Divider, Textarea, Checkbox } from '../components/UI';
import Modal from '../components/Modal';
import { generateId, formatDuration, getDateKey, getWeekDates } from '../lib/utils';
import { KEYS, loadData, saveData } from '../lib/storage';
import { DEFAULT_CATEGORIES, DEFAULT_SCHEDULE, DEFAULT_REMINDERS } from '../data/defaults';
import { syncSettingsToSupabase, supabase } from '../lib/supabase';

export default function Planner({ todayData, setTodayData, profile, setProfile }) {
  // Navigation tabs: today | tomorrow | routine | reminders | pomodoro
  const [subTab, setSubTab] = useState('today');

  // Today Agenda Editing State
  const [editingTodayBlock, setEditingTodayBlock] = useState(null);
  const [editTodayLabel, setEditTodayLabel] = useState('');
  const [editTodayTime, setEditTodayTime] = useState('09:00');
  const [editTodayCategory, setEditTodayCategory] = useState('deep-work');
  const [showAddToday, setShowAddToday] = useState(false);
  const [newTodayBlock, setNewTodayBlock] = useState({ time: '09:00', label: '', category: 'deep-work' });

  // Tomorrow Schedule State
  const [editingTomorrowBlock, setEditingTomorrowBlock] = useState(null);
  const [editTomorrowLabel, setEditTomorrowLabel] = useState('');
  const [editTomorrowTime, setEditTomorrowTime] = useState('09:00');
  const [editTomorrowCategory, setEditTomorrowCategory] = useState('deep-work');
  const [showAddTomorrow, setShowAddTomorrow] = useState(false);
  const [newTomorrowBlock, setNewTomorrowBlock] = useState({ time: '09:00', label: '', category: 'deep-work', recurring: 'daily' });

  // Routine Templates Editing State
  const [editingRoutineBlock, setEditingRoutineBlock] = useState(null);
  const [editRoutineLabel, setEditRoutineLabel] = useState('');
  const [editRoutineTime, setEditRoutineTime] = useState('09:00');
  const [editRoutineCategory, setEditRoutineCategory] = useState('deep-work');
  const [editRoutineRecurring, setEditRoutineRecurring] = useState('daily');
  const [newRoutineBlock, setNewRoutineBlock] = useState({ time: '09:00', label: '', category: 'deep-work', recurring: 'daily' });

  // Reminders State
  const [editingReminderBlock, setEditingReminderBlock] = useState(null);
  const [editReminderLabel, setEditReminderLabel] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('09:00');
  const [editReminderRepeat, setEditReminderRepeat] = useState('daily');
  const [editReminderType, setEditReminderType] = useState('custom');
  const [newReminder, setNewReminder] = useState({ label: '', time: '09:00', repeat: 'daily', type: 'custom' });

  // Pomodoro settings form state
  const [pomodoroWork, setPomodoroWork] = useState(profile.pomodoroWorkMinutes || 25);
  const [pomodoroBreak, setPomodoroBreak] = useState(profile.pomodoroBreakMinutes || 5);
  const [pomodoroSaveStatus, setPomodoroSaveStatus] = useState('idle'); // idle | saved

  // Weekly review state
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [reflection, setReflection] = useState('');

  // General profile update wrapper
  const updateProfile = (key, value) => {
    const updated = { ...profile, [key]: value, updatedAt: new Date().toISOString() };
    setProfile(updated);
    saveData(KEYS.PROFILE, updated);
  };

  // Tomorrow Schedule State Setup
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const [tomorrowSchedule, setTomorrowSchedule] = useState(() => {
    const saved = loadData('accountability_tomorrow');
    if (saved && saved.date === getDateKey(tomorrow)) {
      const hasOldDefaults = saved.schedule?.some(item => ['s1', 's2', 's3', 's4'].includes(item.id));
      if (hasOldDefaults) {
        saveData('accountability_tomorrow', { date: getDateKey(tomorrow), schedule: [] });
        return [];
      }
      return saved.schedule;
    }
    return (profile?.schedule && profile.schedule.length > 0 ? profile.schedule : DEFAULT_SCHEDULE).map((b) => ({ ...b, id: b.id || generateId() }));
  });

  const saveTomorrow = (schedule) => {
    setTomorrowSchedule(schedule);
    saveData('accountability_tomorrow', { date: getDateKey(tomorrow), schedule });
    setTodayData((prev) => ({ ...prev, tomorrowPlanned: true }));
  };

  // --- TODAY ACTIONS ---
  const toggleTodayBlock = (index) => {
    const newSchedule = [...(todayData.schedule || [])];
    newSchedule[index] = { ...newSchedule[index], completed: !newSchedule[index].completed };
    setTodayData({ ...todayData, schedule: newSchedule });
  };

  const moveTodayBlock = (index, direction) => {
    const newSchedule = [...(todayData.schedule || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newSchedule.length) return;
    [newSchedule[index], newSchedule[newIndex]] = [newSchedule[newIndex], newSchedule[index]];
    setTodayData({ ...todayData, schedule: newSchedule });
  };

  const removeTodayBlock = (index) => {
    const newSchedule = todayData.schedule.filter((_, i) => i !== index);
    setTodayData({ ...todayData, schedule: newSchedule });
  };

  const addTodayBlock = () => {
    if (!newTodayBlock.label.trim()) return;
    const block = { ...newTodayBlock, id: generateId(), completed: false, note: '' };
    const newSchedule = [...(todayData.schedule || []), block].sort((a, b) => a.time.localeCompare(b.time));
    setTodayData({ ...todayData, schedule: newSchedule });
    setNewTodayBlock({ time: '09:00', label: '', category: 'deep-work' });
    setShowAddToday(false);
  };

  const startEditToday = (index) => {
    const block = todayData.schedule[index];
    setEditingTodayBlock(index);
    setEditTodayLabel(block.label);
    setEditTodayTime(block.time);
    setEditTodayCategory(block.category);
  };

  const saveEditToday = () => {
    if (editingTodayBlock !== null) {
      const newSchedule = [...(todayData.schedule || [])];
      newSchedule[editingTodayBlock] = {
        ...newSchedule[editingTodayBlock],
        label: editTodayLabel,
        time: editTodayTime,
        category: editTodayCategory
      };
      setTodayData({ ...todayData, schedule: newSchedule });
      setEditingTodayBlock(null);
    }
  };

  // --- TOMORROW ACTIONS ---
  const moveTomorrowBlock = (index, direction) => {
    const newSchedule = [...tomorrowSchedule];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newSchedule.length) return;
    [newSchedule[index], newSchedule[newIndex]] = [newSchedule[newIndex], newSchedule[index]];
    saveTomorrow(newSchedule);
  };

  const removeTomorrowBlock = (index) => {
    const newSchedule = tomorrowSchedule.filter((_, i) => i !== index);
    saveTomorrow(newSchedule);
  };

  const addTomorrowBlock = () => {
    if (!newTomorrowBlock.label.trim()) return;
    const block = { ...newTomorrowBlock, id: generateId(), completed: false, note: '' };
    const newSchedule = [...tomorrowSchedule, block].sort((a, b) => a.time.localeCompare(b.time));
    saveTomorrow(newSchedule);
    setNewTomorrowBlock({ time: '09:00', label: '', category: 'deep-work', recurring: 'daily' });
    setShowAddTomorrow(false);
  };

  const startEditTomorrow = (index) => {
    const block = tomorrowSchedule[index];
    setEditingTomorrowBlock(index);
    setEditTomorrowLabel(block.label);
    setEditTomorrowTime(block.time);
    setEditTomorrowCategory(block.category);
  };

  const saveEditTomorrow = () => {
    if (editingTomorrowBlock !== null) {
      const newSchedule = [...tomorrowSchedule];
      newSchedule[editingTomorrowBlock] = {
        ...newSchedule[editingTomorrowBlock],
        label: editTomorrowLabel,
        time: editTomorrowTime,
        category: editTomorrowCategory
      };
      saveTomorrow(newSchedule);
      setEditingTomorrowBlock(null);
    }
  };

  // --- ROUTINE ACTIONS ---
  const addRoutineBlock = () => {
    if (!newRoutineBlock.label.trim()) return;
    const block = { ...newRoutineBlock, id: generateId(), completed: false, note: '' };
    const schedule = [...(profile.schedule || DEFAULT_SCHEDULE), block].sort((a, b) => a.time.localeCompare(b.time));
    updateProfile('schedule', schedule);
    setNewRoutineBlock({ time: '09:00', label: '', category: 'deep-work', recurring: 'daily' });
  };

  const removeRoutineBlock = (id) => {
    const schedule = (profile.schedule || DEFAULT_SCHEDULE).filter((b) => b.id !== id);
    updateProfile('schedule', schedule);
  };

  const moveRoutineBlock = (index, direction) => {
    const schedule = [...(profile.schedule || DEFAULT_SCHEDULE)];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= schedule.length) return;
    [schedule[index], schedule[newIndex]] = [schedule[newIndex], schedule[index]];
    updateProfile('schedule', schedule);
  };

  const startEditRoutine = (index) => {
    const block = (profile.schedule || DEFAULT_SCHEDULE)[index];
    setEditingRoutineBlock(index);
    setEditRoutineLabel(block.label);
    setEditRoutineTime(block.time);
    setEditRoutineCategory(block.category);
    setEditRoutineRecurring(block.recurring || 'daily');
  };

  const saveEditRoutine = () => {
    if (editingRoutineBlock !== null) {
      const schedule = [...(profile.schedule || DEFAULT_SCHEDULE)];
      schedule[editingRoutineBlock] = {
        ...schedule[editingRoutineBlock],
        label: editRoutineLabel,
        time: editRoutineTime,
        category: editRoutineCategory,
        recurring: editRoutineRecurring
      };
      updateProfile('schedule', schedule);
      setEditingRoutineBlock(null);
    }
  };

  // --- REMINDERS ACTIONS ---
  const addReminder = () => {
    if (!newReminder.label.trim()) return;
    const item = { ...newReminder, id: generateId() };
    const reminders = [...(profile.reminders || DEFAULT_REMINDERS), item].sort((a, b) => a.time.localeCompare(b.time));
    updateProfile('reminders', reminders);
    setNewReminder({ label: '', time: '09:00', repeat: 'daily', type: 'custom' });
  };

  const removeReminder = (id) => {
    const reminders = (profile.reminders || DEFAULT_REMINDERS).filter((r) => r.id !== id);
    updateProfile('reminders', reminders);
  };

  const startEditReminder = (index) => {
    const item = (profile.reminders || DEFAULT_REMINDERS)[index];
    setEditingReminderBlock(index);
    setEditReminderLabel(item.label);
    setEditReminderTime(item.time);
    setEditReminderRepeat(item.repeat || 'daily');
    setEditReminderType(item.type || 'custom');
  };

  const saveEditReminder = () => {
    if (editingReminderBlock !== null) {
      const reminders = [...(profile.reminders || DEFAULT_REMINDERS)];
      reminders[editingReminderBlock] = {
        ...reminders[editingReminderBlock],
        label: editReminderLabel,
        time: editReminderTime,
        repeat: editReminderRepeat,
        type: editReminderType
      };
      updateProfile('reminders', reminders);
      setEditingReminderBlock(null);
    }
  };

  // --- POMODORO ACTIONS ---
  const savePomodoro = () => {
    setPomodoroSaveStatus('saving');
    const updated = {
      ...profile,
      pomodoroWorkMinutes: parseInt(pomodoroWork) || 25,
      pomodoroBreakMinutes: parseInt(pomodoroBreak) || 5,
      updatedAt: new Date().toISOString()
    };
    setProfile(updated);
    saveData(KEYS.PROFILE, updated);
    
    // Attempt cloud sync immediately if online
    if (navigator.onLine && supabase) {
      syncSettingsToSupabase(updated).then(() => {
        setPomodoroSaveStatus('saved');
        setTimeout(() => setPomodoroSaveStatus('idle'), 1500);
      });
    } else {
      setPomodoroSaveStatus('saved');
      setTimeout(() => setPomodoroSaveStatus('idle'), 1500);
    }
  };

  // --- WEEKLY REVIEW DATA (OPTIMIZED WITH useMemo) ---
  const weekData = useMemo(() => {
    const weekDates = getWeekDates();
    const history = loadData(KEYS.HISTORY) || [];
    return weekDates.map((date) => {
      if (date === getDateKey()) return todayData;
      return history.find((h) => h.date === date) || null;
    }).filter(Boolean);
  }, [todayData]);

  const totalWeekWork = useMemo(() => weekData.reduce((s, d) => s + (d.workMinutes || 0), 0), [weekData]);
  const totalWeekWasted = useMemo(() => weekData.reduce((s, d) => s + (d.wastedMinutes || 0), 0), [weekData]);
  const weekNotes = useMemo(() => {
    return weekData.flatMap((d) => {
      if (d.schedule) return d.schedule.filter((b) => b.note).map((b) => `${b.label}: ${b.note}`);
      return d.notes ? [d.notes] : [];
    });
  }, [weekData]);

  const allCategories = useMemo(() => [...DEFAULT_CATEGORIES, ...(profile?.customCategories || [])], [profile?.customCategories]);

  return (
    <div className="space-y-6">
      {/* Sub tabs nav bar */}
      <div className="flex border-b border-divider gap-2 overflow-x-auto pb-px select-none">
        {[
          { id: 'today', label: "Today's Agenda", icon: CheckSquare },
          { id: 'tomorrow', label: 'Plan Tomorrow', icon: Calendar },
          { id: 'routine', label: 'Recurring Routine', icon: Clock },
          { id: 'reminders', label: 'Reminders Builder', icon: Bell },
          { id: 'pomodoro', label: 'Pomodoro Setup', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0
                ${active 
                  ? 'border-black dark:border-white text-text-primary' 
                  : 'border-transparent text-text-muted hover:text-text-primary'}`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Cloud Sync Diagnostic Banner */}
      <div className="flex items-center justify-between text-xs border border-border bg-surface rounded-xl p-3 px-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Database size={13} />
          <span>Local changes synced via timestamp reconciliation.</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold">
          {navigator.onLine ? (
            <span className="text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
              <Sparkles size={11} className="text-yellow-500 animate-pulse" /> Online
            </span>
          ) : (
            <span className="text-red-500 flex items-center gap-1">
              <AlertCircle size={11} /> Offline Cached
            </span>
          )}
        </div>
      </div>

      {/* 1. TODAY'S AGENDA SUB-TAB */}
      {subTab === 'today' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Today's Tasks & Schedule</SectionLabel>
            <Button variant="secondary" size="sm" onClick={() => setShowAddToday(true)}>
              <Plus size={13} /> Add Task
            </Button>
          </div>

          {showAddToday && (
            <Card className="p-4 space-y-3 border-black dark:border-white border-2">
              <CardLabel>Add Quick Block to Today</CardLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input 
                  type="time" 
                  value={newTodayBlock.time} 
                  onChange={(e) => setNewTodayBlock(b => ({ ...b, time: e.target.value }))} 
                />
                <Input 
                  value={newTodayBlock.label} 
                  onChange={(e) => setNewTodayBlock(b => ({ ...b, label: e.target.value }))} 
                  placeholder="Task description" 
                />
                <Select 
                  value={newTodayBlock.category} 
                  onChange={(e) => setNewTodayBlock(b => ({ ...b, category: e.target.value }))}
                >
                  {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => setShowAddToday(false)}>Cancel</Button>
                <Button size="sm" onClick={addTodayBlock}>Add Task</Button>
              </div>
            </Card>
          )}

          <div className="space-y-2.5">
            {(todayData.schedule || []).length > 0 ? (
              todayData.schedule.map((block, i) => (
                <Card key={block.id || i} className="!py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <button 
                      onClick={() => toggleTodayBlock(i)}
                      className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
                    >
                      {block.completed ? (
                        <CheckSquare size={17} className="text-black dark:text-white" />
                      ) : (
                        <Square size={17} />
                      )}
                    </button>

                    <span className="font-mono text-xs text-text-muted shrink-0 w-12">{block.time}</span>
                    
                    {editingTodayBlock === i ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
                        <Input 
                          value={editTodayLabel} 
                          onChange={(e) => setEditTodayLabel(e.target.value)} 
                          className="py-1 px-2 text-xs flex-1 min-w-[140px] w-full"
                          placeholder="Task name"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Input 
                            type="time" 
                            value={editTodayTime} 
                            onChange={(e) => setEditTodayTime(e.target.value)} 
                            className="py-1 px-2 text-xs w-24"
                          />
                          <Select 
                            value={editTodayCategory} 
                            onChange={(e) => setEditTodayCategory(e.target.value)}
                            className="py-1.5 px-2 text-xs w-28"
                          >
                            {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </Select>
                          <button onClick={saveEditToday} className="text-black dark:text-white p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <button onClick={() => setEditingTodayBlock(null)} className="text-text-muted p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className={`text-[13px] font-bold text-text-primary truncate flex-1 ${block.completed ? 'line-through text-text-muted' : ''}`}>
                        {block.label}
                      </span>
                    )}
                  </div>

                  {editingTodayBlock !== i && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Chip variant="default" className="text-[9px] uppercase font-bold py-0.5">{block.category}</Chip>
                      <button 
                        onClick={() => moveTodayBlock(i, -1)} 
                        className="text-text-muted hover:text-text-primary disabled:opacity-20"
                        disabled={i === 0}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveTodayBlock(i, 1)} 
                        className="text-text-muted hover:text-text-primary disabled:opacity-20"
                        disabled={i === (todayData.schedule || []).length - 1}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button 
                        onClick={() => startEditToday(i)} 
                        className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => removeTodayBlock(i)} 
                        className="text-text-muted hover:text-red-500 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-xs text-text-muted py-2 text-center">No schedule blocks logged for today. Create some templates or add quick blocks!</p>
            )}
          </div>

          <Divider />
          <div className="pt-2">
            <Button variant="secondary" className="w-full py-3 text-xs font-bold" onClick={() => setShowWeeklyReview(true)}>
              <BookOpen size={14} /> Open Weekly Review Summary
            </Button>
          </div>
        </div>
      )}

      {/* 2. PLAN TOMORROW SUB-TAB */}
      {subTab === 'tomorrow' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel>Plan Tomorrow</SectionLabel>
              <p className="text-xs text-text-secondary -mt-2">{tomorrowStr}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowAddTomorrow(true)}>
              <Plus size={13} /> Add Task
            </Button>
          </div>

          {showAddTomorrow && (
            <Card className="p-4 space-y-3 border-black dark:border-white border-2">
              <CardLabel>Add Block to Tomorrow</CardLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input 
                  type="time" 
                  value={newTomorrowBlock.time} 
                  onChange={(e) => setNewTomorrowBlock(b => ({ ...b, time: e.target.value }))} 
                />
                <Input 
                  value={newTomorrowBlock.label} 
                  onChange={(e) => setNewTomorrowBlock(b => ({ ...b, label: e.target.value }))} 
                  placeholder="Task description" 
                />
                <Select 
                  value={newTomorrowBlock.category} 
                  onChange={(e) => setNewTomorrowBlock(b => ({ ...b, category: e.target.value }))}
                >
                  {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => setShowAddTomorrow(false)}>Cancel</Button>
                <Button size="sm" onClick={addTomorrowBlock}>Add Block</Button>
              </div>
            </Card>
          )}

          <div className="space-y-2.5">
            {tomorrowSchedule.length > 0 ? (
              tomorrowSchedule.map((block, i) => (
                <Card key={block.id || i} className="!py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-xs text-text-muted shrink-0 w-12">{block.time}</span>
                    {editingTomorrowBlock === i ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
                        <Input 
                          value={editTomorrowLabel} 
                          onChange={(e) => setEditTomorrowLabel(e.target.value)} 
                          className="py-1 px-2 text-xs flex-1 min-w-[140px] w-full"
                          placeholder="Task name"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Input 
                            type="time" 
                            value={editTomorrowTime} 
                            onChange={(e) => setEditTomorrowTime(e.target.value)} 
                            className="py-1 px-2 text-xs w-24"
                          />
                          <Select 
                            value={editTomorrowCategory} 
                            onChange={(e) => setEditTomorrowCategory(e.target.value)}
                            className="py-1.5 px-2 text-xs w-28"
                          >
                            {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </Select>
                          <button onClick={saveEditTomorrow} className="text-black dark:text-white p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <button onClick={() => setEditingTomorrowBlock(null)} className="text-text-muted p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[13px] font-bold text-text-primary truncate flex-1">{block.label}</span>
                    )}
                  </div>

                  {editingTomorrowBlock !== i && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Chip variant="default" className="text-[9px] uppercase font-bold py-0.5">{block.category}</Chip>
                      <button 
                        onClick={() => moveTomorrowBlock(i, -1)} 
                        className="text-text-muted hover:text-text-primary disabled:opacity-20"
                        disabled={i === 0}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveTomorrowBlock(i, 1)} 
                        className="text-text-muted hover:text-text-primary disabled:opacity-20"
                        disabled={i === tomorrowSchedule.length - 1}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button 
                        onClick={() => startEditTomorrow(i)} 
                        className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => removeTomorrowBlock(i)} 
                        className="text-text-muted hover:text-red-500 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-xs text-text-muted py-2 text-center">No blocks planned for tomorrow yet.</p>
            )}
          </div>

          {todayData.tomorrowPlanned && (
            <div className="mt-3">
              <Chip variant="success" className="text-xs font-bold">✓ Tomorrow's timeline is locked in! (+5 pts)</Chip>
            </div>
          )}
        </div>
      )}

      {/* 3. RECURRING ROUTINE SUB-TAB */}
      {subTab === 'routine' && (
        <div className="space-y-4">
          <div>
            <SectionLabel>Routine Template Builder</SectionLabel>
            <p className="text-xs text-text-secondary -mt-2">Define recurring schedules that auto-populate your agenda daily.</p>
          </div>

          {/* Add routine template block form */}
          <Card className="p-5 space-y-4">
            <CardLabel>Create Schedule Block Template</CardLabel>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input 
                type="time" 
                value={newRoutineBlock.time} 
                onChange={(e) => setNewRoutineBlock(b => ({ ...b, time: e.target.value }))} 
              />
              <Input 
                value={newRoutineBlock.label} 
                onChange={(e) => setNewRoutineBlock(b => ({ ...b, label: e.target.value }))} 
                placeholder="Routine block name" 
              />
              <Select 
                value={newRoutineBlock.category} 
                onChange={(e) => setNewRoutineBlock(b => ({ ...b, category: e.target.value }))}
              >
                {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
              <Select 
                value={newRoutineBlock.recurring} 
                onChange={(e) => setNewRoutineBlock(b => ({ ...b, recurring: e.target.value }))}
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="once">One-time</option>
              </Select>
            </div>
            <Button onClick={addRoutineBlock} className="w-full bg-black text-white hover:bg-neutral-800 font-bold" size="sm">
              <Plus size={14} /> Add Block Template
            </Button>
          </Card>

          <div className="space-y-2.5">
            {(profile.schedule || DEFAULT_SCHEDULE).length > 0 ? (
              (profile.schedule || DEFAULT_SCHEDULE).map((block, i) => (
                <Card key={block.id || i} className="!py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-xs text-text-muted shrink-0 w-12">{block.time}</span>
                    {editingRoutineBlock === i ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
                        <Input 
                          value={editRoutineLabel} 
                          onChange={(e) => setEditRoutineLabel(e.target.value)} 
                          className="py-1 px-2 text-xs flex-1 min-w-[140px] w-full"
                          placeholder="Routine name"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Input 
                            type="time" 
                            value={editRoutineTime} 
                            onChange={(e) => setEditRoutineTime(e.target.value)} 
                            className="py-1 px-2 text-xs w-24"
                          />
                          <Select 
                            value={editRoutineCategory} 
                            onChange={(e) => setEditRoutineCategory(e.target.value)}
                            className="py-1.5 px-2 text-xs w-28"
                          >
                            {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </Select>
                          <Select 
                            value={editRoutineRecurring} 
                            onChange={(e) => setEditRoutineRecurring(e.target.value)}
                            className="py-1.5 px-2 text-xs w-28"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekdays">Weekdays</option>
                            <option value="once">One-time</option>
                          </Select>
                          <button onClick={saveEditRoutine} className="text-black dark:text-white p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <button onClick={() => setEditingRoutineBlock(null)} className="text-text-muted p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[13px] font-bold text-text-primary truncate flex-1">{block.label}</span>
                    )}
                  </div>

                  {editingRoutineBlock !== i && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Chip variant="default" className="text-[9px] uppercase font-bold py-0.5">{block.recurring}</Chip>
                      <Chip variant="default" className="text-[9px] uppercase font-bold py-0.5">{block.category}</Chip>
                      <button 
                        onClick={() => moveRoutineBlock(i, -1)} 
                        className="text-text-muted hover:text-text-primary disabled:opacity-20"
                        disabled={i === 0}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveRoutineBlock(i, 1)} 
                        className="text-text-muted hover:text-text-primary disabled:opacity-20"
                        disabled={i === (profile.schedule || DEFAULT_SCHEDULE).length - 1}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button 
                        onClick={() => startEditRoutine(i)} 
                        className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => removeRoutineBlock(block.id)} 
                        className="text-text-muted hover:text-red-500 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-xs text-text-muted py-2 text-center">No routine template blocks saved yet.</p>
            )}
          </div>
        </div>
      )}

      {/* 4. REMINDERS Builder SUB-TAB */}
      {subTab === 'reminders' && (
        <div className="space-y-4">
          <div>
            <SectionLabel>Reminders & Alerts Builder</SectionLabel>
            <p className="text-xs text-text-secondary -mt-2">Customize system alert timers and triggers. No notification schedule is hardcoded.</p>
          </div>

          <Card className="p-5 space-y-4">
            <CardLabel>Create New Reminder Notification</CardLabel>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input 
                value={newReminder.label} 
                onChange={(e) => setNewReminder(r => ({ ...r, label: e.target.value }))} 
                placeholder="Grooming, Medicine, Water..." 
              />
              <Input 
                type="time" 
                value={newReminder.time} 
                onChange={(e) => setNewReminder(r => ({ ...r, time: e.target.value }))} 
              />
              <Select 
                value={newReminder.repeat} 
                onChange={(e) => setNewReminder(r => ({ ...r, repeat: e.target.value }))}
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="once">Once</option>
              </Select>
              <Select 
                value={newReminder.type} 
                onChange={(e) => setNewReminder(r => ({ ...r, type: e.target.value }))}
              >
                <option value="custom">Custom Tag</option>
                <option value="grooming">Grooming Type</option>
                <option value="medicine">Medicine Type</option>
                <option value="water">Water Type</option>
                <option value="sleep">Sleep Type</option>
              </Select>
            </div>
            <Button onClick={addReminder} className="w-full bg-black text-white hover:bg-neutral-800 font-bold" size="sm">
              <Plus size={14} /> Add System Reminder
            </Button>
          </Card>

          <div className="space-y-2.5">
            {(profile.reminders || DEFAULT_REMINDERS).length > 0 ? (
              (profile.reminders || DEFAULT_REMINDERS).map((item, i) => (
                <Card key={item.id || i} className="!py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-xs text-text-muted shrink-0 w-12">{item.time}</span>
                    {editingReminderBlock === i ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
                        <Input 
                          value={editReminderLabel} 
                          onChange={(e) => setEditReminderLabel(e.target.value)} 
                          className="py-1 px-2 text-xs flex-1 min-w-[140px] w-full"
                          placeholder="Reminder label"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Input 
                            type="time" 
                            value={editReminderTime} 
                            onChange={(e) => setEditReminderTime(e.target.value)} 
                            className="py-1 px-2 text-xs w-24"
                          />
                          <Select 
                            value={editReminderRepeat} 
                            onChange={(e) => setEditReminderRepeat(e.target.value)}
                            className="py-1.5 px-2 text-xs w-28"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekdays">Weekdays</option>
                            <option value="once">Once</option>
                          </Select>
                          <Select 
                            value={editReminderType} 
                            onChange={(e) => setEditReminderType(e.target.value)}
                            className="py-1.5 px-2 text-xs w-28"
                          >
                            <option value="custom">Custom</option>
                            <option value="grooming">Grooming</option>
                            <option value="medicine">Medicine</option>
                            <option value="water">Water</option>
                            <option value="sleep">Sleep</option>
                          </Select>
                          <button onClick={saveEditReminder} className="text-black dark:text-white p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <button onClick={() => setEditingReminderBlock(null)} className="text-text-muted p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[13px] font-bold text-text-primary truncate flex-1">{item.label}</span>
                    )}
                  </div>

                  {editingReminderBlock !== i && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Chip variant="default" className="text-[9px] uppercase font-bold py-0.5">{item.repeat}</Chip>
                      <Chip variant="default" className="text-[9px] uppercase font-bold py-0.5">{item.type}</Chip>
                      <button 
                        onClick={() => startEditReminder(i)} 
                        className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => removeReminder(item.id)} 
                        className="text-text-muted hover:text-red-500 p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-xs text-text-muted py-2 text-center">No notifications configured. Enter settings above to populate.</p>
            )}
          </div>
        </div>
      )}

      {/* 5. POMODORO TIMER SETUP SUB-TAB */}
      {subTab === 'pomodoro' && (
        <div className="space-y-4">
          <div>
            <SectionLabel>Pomodoro Timer Settings</SectionLabel>
            <p className="text-xs text-text-secondary -mt-2">Customize the base intervals for your focus blocks and breaks.</p>
          </div>

          <Card className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <CardLabel>Focus Session Work Time (minutes)</CardLabel>
                <div className="flex items-center gap-3 mt-1.5">
                  <Input 
                    type="number" 
                    min="1" 
                    max="180" 
                    value={pomodoroWork} 
                    onChange={(e) => setPomodoroWork(e.target.value)} 
                    className="text-sm font-mono"
                  />
                  <span className="text-xs text-text-muted shrink-0">min</span>
                </div>
                <p className="text-[11px] text-text-muted mt-2">Default is 25 minutes. Increase for deep focus training sessions.</p>
              </div>

              <div>
                <CardLabel>Rest Break Time (minutes)</CardLabel>
                <div className="flex items-center gap-3 mt-1.5">
                  <Input 
                    type="number" 
                    min="1" 
                    max="60" 
                    value={pomodoroBreak} 
                    onChange={(e) => setPomodoroBreak(e.target.value)} 
                    className="text-sm font-mono"
                  />
                  <span className="text-xs text-text-muted shrink-0">min</span>
                </div>
                <p className="text-[11px] text-text-muted mt-2">Default is 5 minutes. Take quick walks or stretch during this gap.</p>
              </div>
            </div>

            <Divider />

            <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 border border-divider">
              <div className="space-y-1">
                <span className="text-xs font-bold text-text-primary block">Active Interval Metrics</span>
                <span className="text-[11px] text-text-secondary block">
                  Focus: {pomodoroWork} min | Break: {pomodoroBreak} min | Target Cycle Ratio: {Math.round((pomodoroWork / (parseInt(pomodoroWork) + parseInt(pomodoroBreak))) * 100)}%
                </span>
              </div>
              <Button 
                onClick={savePomodoro} 
                disabled={pomodoroSaveStatus === 'saving'}
                className="bg-black text-white hover:bg-neutral-800 font-bold shrink-0 text-xs py-2 px-4"
              >
                {pomodoroSaveStatus === 'saving' && <RefreshCw size={12} className="animate-spin mr-1.5" />}
                {pomodoroSaveStatus === 'saved' ? 'Saved' : 'Save Setup'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Weekly Review Modal */}
      <Modal isOpen={showWeeklyReview} onClose={() => setShowWeeklyReview(false)} title="Weekly Reflection & Review" maxWidth="max-w-lg">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="border-r border-divider pr-4">
              <CardLabel>Hours Focused</CardLabel>
              <div className="font-mono text-xl font-bold mt-1">{formatDuration(totalWeekWork)}</div>
            </div>
            <div className="pl-2">
              <CardLabel>Hours Wasted</CardLabel>
              <div className="font-mono text-xl font-bold mt-1 text-text-secondary">{formatDuration(totalWeekWasted)}</div>
            </div>
          </div>

          {weekNotes.length > 0 && (
            <>
              <Divider />
              <CardLabel>Study & Work Logs</CardLabel>
              <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-2">
                {weekNotes.map((note, i) => (
                  <div key={i} className="text-xs text-text-secondary leading-relaxed border-l-2 border-neutral-300 pl-3 py-0.5">
                    {note}
                  </div>
                ))}
              </div>
            </>
          )}

          <Divider />
          <div>
            <CardLabel>Weekly Reflection & Notes</CardLabel>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What went well? What obstacles did you encounter? Define focus adjustments for next week..."
              rows={5}
              className="mt-2 text-xs"
            />
          </div>
          <Button onClick={() => setShowWeeklyReview(false)} className="w-full bg-black text-white hover:bg-neutral-800">Complete Reflection</Button>
        </div>
      </Modal>
    </div>
  );
}

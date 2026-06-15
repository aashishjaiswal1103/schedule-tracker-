import React, { useState, useMemo } from 'react';
import { Moon, Droplets, Zap, Smartphone, Clock, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Card, CardLabel, SectionLabel, Button, Input, Select, Chip, Divider, ProgressBar, Textarea } from '../components/UI';
import { BarChart } from '../components/Charts';
import { useClock } from '../hooks/useClock';
import { formatDuration, minutesUntil, getWeekDates, getDateKey } from '../lib/utils';
import { KEYS, loadData } from '../lib/storage';

const DISTRACTION_CATEGORIES = ['YouTube', 'Phone', 'Social Media', 'Random browsing', 'Other'];
const ENERGY_LABELS = ['Low Energy', 'Low-Mid', 'Medium', 'Mid-High', 'Peak Energy'];
const ENERGY_COLORS = ['#E5E5E5', '#A3A3A3', '#737373', '#404040', '#000000'];

export default function SleepHealth({ todayData, setTodayData, profile }) {
  const now = useClock();
  const [sleepForm, setSleepForm] = useState({ bedtime: '23:00', wakeTime: '06:30', quality: 3 });
  const [wasteForm, setWasteForm] = useState({ category: 'YouTube', duration: 15, note: '' });

  // Screen curfew
  const curfewTime = profile?.screenCurfewTime || '22:00';
  const minsUntilCurfew = minutesUntil(curfewTime);
  const showCurfewBanner = minsUntilCurfew > 0 && minsUntilCurfew <= 30;

  // Sleep debt calculation
  const targetHours = profile?.sleepTargetHours || 7.5;
  const weekDates = getWeekDates();
  const history = loadData(KEYS.HISTORY) || [];

  const weekSleepData = useMemo(() => {
    return weekDates.map((date) => {
      if (date === getDateKey()) return todayData.sleepData;
      const day = history.find((h) => h.date === date);
      return day?.sleepData || null;
    }).filter(Boolean);
  }, [weekDates, history, todayData.sleepData]);

  const weekSleepHours = weekSleepData.reduce((sum, s) => sum + (s?.duration || 0), 0);
  const weekTargetHours = weekSleepData.length * targetHours;
  const sleepDebt = Math.max(0, weekTargetHours - weekSleepHours);
  const sleepDebtHrs = Math.floor(sleepDebt);
  const sleepDebtMins = Math.round((sleepDebt - sleepDebtHrs) * 60);

  // Hydration visual
  const hydration = todayData.hydration || 0;
  const hydrationGoal = profile?.hydrationGoal || 8;
  const hydrationPct = Math.min((hydration / hydrationGoal) * 100, 100);

  // Log sleep
  const logSleep = () => {
    const [bedH, bedM] = sleepForm.bedtime.split(':').map(Number);
    const [wakeH, wakeM] = sleepForm.wakeTime.split(':').map(Number);
    let duration = (wakeH + wakeM / 60) - (bedH + bedM / 60);
    if (duration < 0) duration += 24;

    setTodayData((prev) => ({
      ...prev,
      sleepLogged: true,
      sleepData: {
        bedtime: sleepForm.bedtime,
        wakeTime: sleepForm.wakeTime,
        duration: Math.round(duration * 10) / 10,
        quality: sleepForm.quality,
      },
    }));
  };

  // Log energy
  const logEnergy = (period, level) => {
    setTodayData((prev) => {
      const logs = [...(prev.energyLogs || [])];
      const existing = logs.findIndex((l) => l.period === period);
      const entry = { period, level, time: new Date().toISOString() };
      if (existing >= 0) {
        logs[existing] = entry;
      } else {
        logs.push(entry);
      }
      return { ...prev, energyLogs: logs };
    });
  };

  // Log distraction
  const logDistraction = () => {
    const entry = {
      category: wasteForm.category,
      duration: parseInt(wasteForm.duration) || 0,
      note: wasteForm.note,
      time: new Date().toISOString(),
    };
    setTodayData((prev) => ({
      ...prev,
      wastedTime: [...(prev.wastedTime || []), entry],
      wastedMinutes: (prev.wastedMinutes || 0) + entry.duration,
    }));
    setWasteForm({ category: 'YouTube', duration: 15, note: '' });
  };

  // Wasted time chart (by category)
  const wastedByCategory = useMemo(() => {
    const map = {};
    (todayData.wastedTime || []).forEach((w) => {
      map[w.category] = (map[w.category] || 0) + w.duration;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value, color: 'var(--text-primary)' }));
  }, [todayData.wastedTime]);

  // Weekly wasted time
  const weekWastedData = useMemo(() => {
    return weekDates.map((date) => {
      if (date === getDateKey()) return { label: date.slice(5), value: todayData.wastedMinutes || 0 };
      const day = history.find((h) => h.date === date);
      return { label: date.slice(5), value: day?.wastedMinutes || 0, color: 'var(--text-secondary)' };
    });
  }, [weekDates, history, todayData.wastedMinutes]);

  return (
    <div className="space-y-8">
      {/* Screen Curfew Banner */}
      {showCurfewBanner && (
        <Card className="!border-black bg-neutral-50 dark:bg-neutral-900 shadow-sm">
          <div className="flex items-center gap-4">
            <Smartphone size={20} className="text-black dark:text-white" />
            <div>
              <span className="text-sm font-bold text-text-primary">Screen curfew in {Math.round(minsUntilCurfew)} min</span>
              <p className="text-xs text-text-secondary mt-0.5">Time to shut down devices and wind down.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Sleep Logger Section */}
      <div>
        <SectionLabel>Sleep Logging</SectionLabel>
        {todayData.sleepLogged && todayData.sleepData ? (
          <Card className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <CardLabel>LAST NIGHT'S LOG</CardLabel>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-extrabold">{todayData.sleepData.duration} hrs</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Moon
                      key={s}
                      size={14}
                      className={s <= todayData.sleepData.quality ? 'text-black dark:text-white' : 'text-neutral-200 dark:text-neutral-800'}
                      fill={s <= todayData.sleepData.quality ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs font-semibold text-text-muted">{todayData.sleepData.bedtime} - {todayData.sleepData.wakeTime}</span>
            </div>
            <Chip variant="success">Logged ✓</Chip>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CardLabel>Bedtime (Last night)</CardLabel>
                <Input type="time" value={sleepForm.bedtime} onChange={(e) => setSleepForm((s) => ({ ...s, bedtime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <CardLabel>Wake Time (This morning)</CardLabel>
                <Input type="time" value={sleepForm.wakeTime} onChange={(e) => setSleepForm((s) => ({ ...s, wakeTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <CardLabel>Sleep Quality Rating</CardLabel>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSleepForm((s) => ({ ...s, quality: val }))}
                    className={`w-10 h-10 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95
                      ${sleepForm.quality === val 
                        ? 'bg-black text-white dark:bg-white dark:text-black' 
                        : 'bg-[#F5F5F7] hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-text-secondary'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={logSleep} className="w-full bg-black text-white hover:bg-neutral-800">Save Sleep Log</Button>
          </Card>
        )}
      </div>

      {/* Sleep Debt Tracking Card */}
      <Card className="p-6">
        <CardLabel>Weekly Sleep Debt</CardLabel>
        <div className="mt-3 flex items-center gap-3">
          {sleepDebt > 0 ? (
            <>
              <AlertTriangle size={18} className="text-neutral-800 dark:text-neutral-200" />
              <span className="text-sm font-semibold text-text-primary">
                Accumulated Debt: <span className="font-mono font-bold text-black dark:text-white">{sleepDebtHrs}h {sleepDebtMins}m</span>
              </span>
            </>
          ) : (
            <>
              <Moon size={18} className="text-neutral-800 dark:text-neutral-200" />
              <span className="text-sm font-semibold text-text-primary">All sleep goals are met! No debt this week. 🎉</span>
            </>
          )}
        </div>
      </Card>

      {/* Hydration Section */}
      <div>
        <SectionLabel>Hydration Tracker</SectionLabel>
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative w-16 h-24 shrink-0">
              {/* Glass visual */}
              <div className="absolute inset-0 border-2 border-black dark:border-white rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-950">
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                  style={{ height: `${hydrationPct}%`, background: 'var(--text-primary)' }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Droplets size={24} className="mix-blend-difference text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight font-mono">{hydration}</span>
                <span className="text-xs text-text-muted">/ {hydrationGoal} Glass</span>
              </div>
              <p className="text-xs text-text-secondary">Track your daily water intake goals.</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="px-3" onClick={() => setTodayData((prev) => ({ ...prev, hydration: Math.max(0, (prev.hydration || 0) - 1) }))}>
                  <Minus size={12} />
                </Button>
                <Button size="sm" className="bg-black text-white hover:bg-neutral-800 font-bold" onClick={() => setTodayData((prev) => ({ ...prev, hydration: (prev.hydration || 0) + 1 }))}>
                  <Plus size={12} /> Add Glass
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Energy Level Check-in */}
      <div>
        <SectionLabel>Energy Check-ins</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Morning', 'Afternoon', 'Evening'].map((period) => {
            const log = (todayData.energyLogs || []).find((l) => l.period === period);
            return (
              <Card key={period} className="p-5">
                <CardLabel>{period} check-in</CardLabel>
                <div className="flex gap-1.5 mt-3">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => logEnergy(period, level)}
                      className="flex-1 h-8 rounded-lg text-xs font-bold transition-all duration-150 active:scale-90"
                      style={{
                        backgroundColor: log?.level === level ? '#000000' : 'var(--chip-bg)',
                        color: log?.level === level ? '#FFFFFF' : 'var(--text-secondary)'
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                {log && (
                  <span className="text-[10px] font-bold text-text-muted mt-2 block tracking-wide uppercase">
                    {ENERGY_LABELS[log.level - 1]}
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Wasted Time Tracker */}
      <div>
        <SectionLabel>Wasted Time Log</SectionLabel>
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-baseline border-b border-divider pb-3">
            <CardLabel>TOTAL TIME DISTRACTED</CardLabel>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-extrabold text-black dark:text-white">{todayData.wastedMinutes || 0}</span>
              <span className="text-xs text-text-secondary">Minutes</span>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={wasteForm.category} onChange={(e) => setWasteForm((w) => ({ ...w, category: e.target.value }))}>
              {DISTRACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input
              type="number"
              value={wasteForm.duration}
              onChange={(e) => setWasteForm((w) => ({ ...w, duration: e.target.value }))}
              placeholder="Duration (min)"
              min="1"
            />
            <Button onClick={logDistraction} className="bg-black text-white hover:bg-neutral-800 font-bold">
              <Plus size={14} /> Log Distraction
            </Button>
          </div>

          {/* Log list */}
          {(todayData.wastedTime || []).length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-divider">
              {(todayData.wastedTime || []).map((w, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-divider last:border-none">
                  <div className="flex items-center gap-3">
                    <Chip variant="default" className="text-[10px] uppercase">{w.category}</Chip>
                    {w.note && <span className="text-text-secondary">"{w.note}"</span>}
                  </div>
                  <span className="font-mono font-bold">{w.duration} min</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Wasted Time Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {wastedByCategory.length > 0 && (
            <Card className="p-6">
              <CardLabel>Distractions by Category</CardLabel>
              <div className="mt-4">
                <BarChart data={wastedByCategory} height={100} />
              </div>
            </Card>
          )}

          <Card className="p-6">
            <CardLabel>Weekly Distraction Levels</CardLabel>
            <div className="mt-4">
              <BarChart data={weekWastedData} height={100} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

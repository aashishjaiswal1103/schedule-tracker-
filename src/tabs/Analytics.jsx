import React, { useState, useMemo } from 'react';
import { Flame, Award, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardLabel, SectionLabel, Chip, Divider, StatNumber } from '../components/UI';
import Modal from '../components/Modal';
import Heatmap from '../components/Heatmap';
import { BarChart, LineChart, CalendarGrid } from '../components/Charts';
import { KEYS, loadData } from '../lib/storage';
import { getDateKey, formatDuration, getWeekDates, getDayOfWeek } from '../lib/utils';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HABITS = ['Deep Work', 'Grooming', 'Medicine', 'Sleep', 'Hydration'];

export default function Analytics({ todayData, profile }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const history = loadData(KEYS.HISTORY) || [];
  const now = new Date();

  // Include today in analytics
  const allData = useMemo(() => {
    const todaySummary = {
      date: getDateKey(),
      score: todayData.score || 0,
      workMinutes: todayData.workMinutes || 0,
      wastedMinutes: todayData.wastedMinutes || 0,
      habits: todayData.habits || {},
      hydration: todayData.hydration || 0,
      sleepData: todayData.sleepData,
      scheduleCompletion: todayData.schedule
        ? todayData.schedule.filter((b) => b.completed).length / Math.max(todayData.schedule.length, 1)
        : 0,
    };
    return [todaySummary, ...history];
  }, [todayData, history]);

  // Streak calculations
  const calculateStreak = (checkFn) => {
    let streak = 0;
    const sorted = [...allData].sort((a, b) => b.date.localeCompare(a.date));
    
    // Find current consecutive streak starting from today/yesterday
    for (let i = 0; i < sorted.length; i++) {
      if (checkFn(sorted[i])) {
        streak++;
      } else {
        // Allow streak to continue if we're looking at today and it hasn't failed yet
        if (i === 0) continue;
        break;
      }
    }

    // Find best streak in history
    let best = 0;
    let temp = 0;
    const chronological = [...allData].sort((a, b) => a.date.localeCompare(b.date));
    chronological.forEach((day) => {
      if (checkFn(day)) {
        temp++;
        if (temp > best) best = temp;
      } else {
        temp = 0;
      }
    });

    return { current: streak, best: Math.max(streak, best) };
  };

  const streaks = useMemo(() => ({
    'Deep Work': calculateStreak((d) => (d.workMinutes || 0) >= 120),
    'Grooming': calculateStreak((d) => d.habits?.grooming),
    'Medicine': calculateStreak((d) => d.habits?.medicine),
    'Sleep': calculateStreak((d) => !!d.sleepData),
    'Hydration': calculateStreak((d) => (d.hydration || 0) >= (profile?.hydrationGoal || 8)),
  }), [allData, profile]);

  // Best day of week
  const dayOfWeekScores = useMemo(() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);
    allData.forEach((d) => {
      const dow = new Date(d.date + 'T12:00:00').getDay();
      sums[dow] += d.score || 0;
      counts[dow]++;
    });
    return WEEKDAY_NAMES.map((name, i) => ({
      label: name,
      value: counts[i] > 0 ? Math.round(sums[i] / counts[i]) : 0,
      color: 'var(--text-primary)',
    }));
  }, [allData]);

  // Goal completion rate (last 30 days)
  const completionRate = useMemo(() => {
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const day = allData.find((h) => h.date === key);
      last30.push({
        label: key.slice(5),
        value: day ? Math.round((day.scheduleCompletion || 0) * 100) : 0,
      });
    }
    return last30;
  }, [allData]);

  // 7-day rolling average
  const rollingAvg = useMemo(() => {
    return completionRate.map((d, i) => {
      const start = Math.max(0, i - 6);
      const slice = completionRate.slice(start, i + 1);
      const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length;
      return { label: d.label, value: Math.round(avg) };
    });
  }, [completionRate]);

  // Weekly summary
  const weekDates = getWeekDates();
  const weekData = weekDates.map((date) => allData.find((h) => h.date === date)).filter(Boolean);
  const weekScores = weekData.map((d) => d.score || 0);
  const bestDay = weekData.reduce((best, d) => (d.score || 0) > (best?.score || 0) ? d : best, weekData[0]);
  const worstDay = weekData.reduce((worst, d) => (d.score || 0) < (worst?.score || Infinity) ? d : worst, weekData[0]);
  const totalWeekWork = weekData.reduce((s, d) => s + (d.workMinutes || 0), 0);
  const totalWeekWasted = weekData.reduce((s, d) => s + (d.wastedMinutes || 0), 0);

  // Selected day details
  const dayDetail = selectedDay ? allData.find((h) => h.date === selectedDay) : null;

  return (
    <div className="space-y-8">
      
      {/* Consistency Heatmap */}
      <div>
        <SectionLabel>Consistency Heatmap</SectionLabel>
        <Card className="p-6">
          <Heatmap history={allData} days={90} />
        </Card>
      </div>

      {/* Streak Counters */}
      <div>
        <SectionLabel>Streaks & Habits</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {HABITS.map((habit) => (
            <Card key={habit} className="p-5 text-center flex flex-col items-center justify-center">
              <Flame size={18} className="text-black dark:text-white" />
              <div className="font-mono text-2xl font-extrabold mt-2">{streaks[habit]?.current || 0}</div>
              <span className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mt-1">{habit}</span>
              <div className="mt-3">
                <Chip variant="default" className="text-[9px] uppercase font-bold py-0.5 border border-border">
                  Best: {streaks[habit]?.best || 0}
                </Chip>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Side-by-Side Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardLabel>Average Score by Day of Week</CardLabel>
          <div className="mt-6">
            <BarChart data={dayOfWeekScores} height={120} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CardLabel>Schedule Completion Rate (30 Days)</CardLabel>
            <span className="text-[10px] uppercase font-bold text-text-muted">7-day average</span>
          </div>
          <div className="mt-4">
            <LineChart data={rollingAvg} height={120} />
          </div>
        </Card>
      </div>

      {/* Weekly Summary */}
      <div>
        <SectionLabel>Weekly Summary Details</SectionLabel>
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="border-r border-divider pr-4">
              <CardLabel>Best Day</CardLabel>
              <div className="font-mono text-lg font-bold mt-1 text-black dark:text-white">
                {bestDay?.date ? new Date(bestDay.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
              </div>
              <span className="text-xs text-text-secondary font-semibold">{bestDay?.score || 0} pts</span>
            </div>
            
            <div className="border-r border-divider pr-4 md:pl-2">
              <CardLabel>Worst Day</CardLabel>
              <div className="font-mono text-lg font-bold mt-1 text-text-secondary">
                {worstDay?.date ? new Date(worstDay.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
              </div>
              <span className="text-xs text-text-secondary font-semibold">{worstDay?.score || 0} pts</span>
            </div>

            <div className="border-r border-divider pr-4 md:pl-2">
              <CardLabel>Hours Focused</CardLabel>
              <div className="font-mono text-lg font-bold mt-1">{formatDuration(totalWeekWork)}</div>
            </div>

            <div className="md:pl-2">
              <CardLabel>Hours Wasted</CardLabel>
              <div className="font-mono text-lg font-bold mt-1 text-text-secondary">{formatDuration(totalWeekWasted)}</div>
            </div>
          </div>

          {weekScores.length > 0 && (
            <div className="pt-4 border-t border-divider">
              <CardLabel>Weekly score timeline</CardLabel>
              <div className="flex gap-2 mt-3">
                {weekDates.map((date, i) => {
                  const day = allData.find((h) => h.date === date);
                  const score = day?.score || 0;
                  return (
                    <div key={i} className="flex-1 text-center space-y-1">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          backgroundColor: score >= 70 ? 'var(--text-primary)' : score >= 40 ? 'var(--text-secondary)' : score > 0 ? 'var(--border-hover)' : 'var(--border)' 
                        }}
                      />
                      <span className="text-[10px] font-bold text-text-muted">{WEEKDAY_NAMES[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Monthly Calendar View */}
      <div>
        <SectionLabel>Monthly Summary Calendar</SectionLabel>
        <Card className="p-6">
          <CalendarGrid
            year={now.getFullYear()}
            month={now.getMonth()}
            history={allData}
            onDayClick={(day) => {
              const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              setSelectedDay(dateStr);
            }}
          />
        </Card>
      </div>

      {/* Day Detail Modal */}
      <Modal isOpen={!!selectedDay} onClose={() => setSelectedDay(null)} title={`Date Details: ${selectedDay}`}>
        {dayDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CardLabel>Productivity Score</CardLabel>
                <div className="font-mono text-3xl font-extrabold mt-1">{dayDetail.score} pts</div>
              </div>
              <div>
                <CardLabel>Schedule Completion</CardLabel>
                <div className="font-mono text-xl font-bold mt-1">{Math.round((dayDetail.scheduleCompletion || 0) * 100)}%</div>
              </div>
              <div>
                <CardLabel>Focused Hours</CardLabel>
                <div className="font-mono text-xl font-bold mt-1">{formatDuration(dayDetail.workMinutes || 0)}</div>
              </div>
              <div>
                <CardLabel>Wasted Hours</CardLabel>
                <div className="font-mono text-xl font-bold mt-1 text-text-secondary">{formatDuration(dayDetail.wastedMinutes || 0)}</div>
              </div>
            </div>
            
            {dayDetail.sleepData && (
              <>
                <Divider />
                <div>
                  <CardLabel>Sleep Details</CardLabel>
                  <div className="text-sm font-semibold mt-1">
                    {dayDetail.sleepData.duration} hrs logged · Quality rating {dayDetail.sleepData.quality}/5
                  </div>
                  <span className="text-xs text-text-muted mt-0.5 block">
                    Bedtime: {dayDetail.sleepData.bedtime} - Wake: {dayDetail.sleepData.wakeTime}
                  </span>
                </div>
              </>
            )}

            {dayDetail.notes && (
              <>
                <Divider />
                <div>
                  <CardLabel>Daily Notes</CardLabel>
                  <p className="text-sm text-text-secondary italic mt-1 font-medium">"{dayDetail.notes}"</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No historical log found for this date.</p>
        )}
      </Modal>
    </div>
  );
}

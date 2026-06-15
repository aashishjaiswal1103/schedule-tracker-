import { useEffect, useRef } from 'react';
import { getDateKey } from '../lib/utils';
import { KEYS, loadData, saveData } from '../lib/storage';
import { calculateDailyScore } from '../lib/score';
import { syncDayToSupabase } from '../lib/supabase';
import { createTodayData, createDaySummary, DEFAULT_SCHEDULE } from '../data/defaults';

export function useDailyReset(todayData, setTodayData, profile) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const currentDate = getDateKey();
    const savedToday = loadData(KEYS.TODAY);

    if (!savedToday || savedToday.date !== currentDate) {
      // Archive yesterday's data if it exists
      if (savedToday && savedToday.date) {
        const finalScore = calculateDailyScore(savedToday, profile);
        savedToday.score = finalScore.score;

        const summary = createDaySummary(savedToday);
        const history = loadData(KEYS.HISTORY) || [];
        // Avoid duplicates
        const existing = history.findIndex((h) => h.date === summary.date);
        if (existing >= 0) {
          history[existing] = summary;
        } else {
          history.unshift(summary);
        }
        // Keep last 365 days
        saveData(KEYS.HISTORY, history.slice(0, 365));
        
        // Sync to Supabase
        syncDayToSupabase(summary);
      }

        // Create fresh today
        const schedule = profile?.schedule || DEFAULT_SCHEDULE;
        const freshToday = createTodayData(currentDate, schedule, profile?.reminders);
        saveData(KEYS.TODAY, freshToday);
        setTodayData(freshToday);
    } else {
      setTodayData(savedToday);
    }
  }, []);

  // Midnight watcher — check every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = getDateKey();
      if (todayData && todayData.date !== currentDate) {
        checkedRef.current = false;
        // Trigger reset by re-running the effect logic
        const finalScore = calculateDailyScore(todayData, profile);
        const updated = { ...todayData, score: finalScore.score };
        const summary = createDaySummary(updated);
        const history = loadData(KEYS.HISTORY) || [];
        const existing = history.findIndex((h) => h.date === summary.date);
        if (existing >= 0) {
          history[existing] = summary;
        } else {
          history.unshift(summary);
        }
        saveData(KEYS.HISTORY, history.slice(0, 365));
        syncDayToSupabase(summary);

        const schedule = profile?.schedule || DEFAULT_SCHEDULE;
        const freshToday = createTodayData(currentDate, schedule, profile?.reminders);
        saveData(KEYS.TODAY, freshToday);
        setTodayData(freshToday);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [todayData, profile]);
}

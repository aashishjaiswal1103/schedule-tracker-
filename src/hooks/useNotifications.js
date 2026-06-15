import { useEffect, useRef } from 'react';
import { requestNotificationPermission, scheduleNotification, sendNotification } from '../lib/notifications';
import { minutesUntil } from '../lib/utils';

export function useNotifications(profile, todayData) {
  const timeoutsRef = useRef([]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // Clear previous scheduled notifications
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!profile?.notifications) return;

    const notifs = profile.notifications;

    // Medicine reminder
    if (notifs.medicine) {
      const t = scheduleNotification('09:00', '💊 Medicine Time', 'Time to take your medicine', 'medicine');
      if (t) timeoutsRef.current.push(t);
    }

    // Grooming reminder
    if (notifs.grooming) {
      const t = scheduleNotification('08:00', '🪥 Grooming', 'Complete your grooming routine', 'grooming');
      if (t) timeoutsRef.current.push(t);
    }

    // Water reminders every 2 hours (8am - 8pm)
    if (notifs.water) {
      for (let h = 8; h <= 20; h += 2) {
        const timeStr = `${String(h).padStart(2, '0')}:00`;
        const t = scheduleNotification(timeStr, '💧 Hydrate', 'Time to drink water!', `water-${h}`);
        if (t) timeoutsRef.current.push(t);
      }
    }

    // Screen curfew
    if (notifs.curfew && profile.screenCurfewTime) {
      // 30 min warning
      const minsUntilCurfew = minutesUntil(profile.screenCurfewTime);
      if (minsUntilCurfew > 30) {
        const warningDelay = (minsUntilCurfew - 30) * 60000;
        const t = setTimeout(() => {
          sendNotification('⏰ Screen Curfew Warning', '30 minutes until screen curfew', 'curfew-warning');
        }, warningDelay);
        timeoutsRef.current.push(t);
      }
      // At curfew
      const t = scheduleNotification(profile.screenCurfewTime, '🌙 Screen Curfew', 'Time to put devices away', 'curfew');
      if (t) timeoutsRef.current.push(t);
    }

    // End of day summary
    if (notifs.endOfDay && profile.sleepTargetTime) {
      const t = scheduleNotification(profile.sleepTargetTime, '📊 Daily Summary',
        `Today's score: ${todayData?.score || 0}/100`, 'eod-summary');
      if (t) timeoutsRef.current.push(t);
    }

    // Morning briefing
    if (notifs.morningBriefing && profile.wakeTime) {
      const t = scheduleNotification(profile.wakeTime, '☀️ Good Morning',
        'Check your accountability dashboard for today\'s plan', 'morning');
      if (t) timeoutsRef.current.push(t);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [profile, todayData?.score]);
}

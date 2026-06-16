// Default data for fresh installs

export const DEFAULT_PROFILE = {
  name: '',
  avatarInitials: '',
  wakeTime: '06:30',
  sleepTargetTime: '22:30',
  sleepTargetHours: 7.5,
  dailyWorkHourGoal: 8,
  weeklyWorkHourGoal: 50,
  screenCurfewTime: '22:00',
  hydrationGoal: 8,
  theme: 'light', // light | dark | focus
  notifications: {
    medicine: true,
    water: true,
    grooming: true,
    sessionStartEnd: true,
    curfew: true,
    morningBriefing: true,
    endOfDay: true,
  },
  customCategories: [],
  schedule: [], // will be initialized dynamically
  reminders: [], // will be initialized dynamically
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_CATEGORIES = [
  { id: 'deep-work', label: 'Deep Work', color: '#2D5016' },
  { id: 'learning', label: 'Learning', color: '#3D6B1F' },
  { id: 'exercise', label: 'Exercise', color: '#4F8A2A' },
  { id: 'personal', label: 'Personal', color: '#C4687A' },
  { id: 'rest', label: 'Rest', color: '#E8A040' },
  { id: 'admin', label: 'Admin', color: '#6B6B6B' },
];

export const DEFAULT_SCHEDULE = [];

export const DEFAULT_REMINDERS = [];

export function createTodayData(date, schedule, reminders) {
  const finalReminders = (reminders && reminders.length > 0 ? reminders : DEFAULT_REMINDERS).map((r) => ({ ...r, completed: false }));
  return {
    date,
    schedule: (schedule && schedule.length > 0 ? schedule : DEFAULT_SCHEDULE).map((b) => ({ ...b, completed: false, note: '' })),
    reminders: finalReminders,
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
  };
}

export function createDaySummary(todayData) {
  return {
    date: todayData.date,
    score: todayData.score,
    workMinutes: todayData.workMinutes,
    wastedMinutes: todayData.wastedMinutes,
    habits: { ...todayData.habits },
    hydration: todayData.hydration,
    sleepData: todayData.sleepData,
    energyLogs: todayData.energyLogs,
    scheduleCompletion: todayData.schedule
      ? todayData.schedule.filter((b) => b.completed).length / Math.max(todayData.schedule.length, 1)
      : 0,
    sessions: todayData.sessions,
    notes: todayData.notes,
  };
}

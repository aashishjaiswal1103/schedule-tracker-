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

export const DEFAULT_SCHEDULE = [
  { id: 's1', time: '06:30', label: 'Wake Up + Freshen Up', category: 'personal', recurring: 'daily', completed: false, note: '' },
  { id: 's2', time: '07:00', label: 'Exercise', category: 'exercise', recurring: 'daily', completed: false, note: '' },
  { id: 's3', time: '08:00', label: 'Breakfast + Grooming', category: 'personal', recurring: 'daily', completed: false, note: '' },
  { id: 's4', time: '09:00', label: 'Deep Work Block 1', category: 'deep-work', recurring: 'weekdays', completed: false, note: '' },
  { id: 's5', time: '11:00', label: 'Short Break', category: 'rest', recurring: 'weekdays', completed: false, note: '' },
  { id: 's6', time: '11:15', label: 'Deep Work Block 2', category: 'deep-work', recurring: 'weekdays', completed: false, note: '' },
  { id: 's7', time: '13:00', label: 'Lunch Break', category: 'rest', recurring: 'daily', completed: false, note: '' },
  { id: 's8', time: '14:00', label: 'Learning / Study', category: 'learning', recurring: 'weekdays', completed: false, note: '' },
  { id: 's9', time: '16:00', label: 'Deep Work Block 3', category: 'deep-work', recurring: 'weekdays', completed: false, note: '' },
  { id: 's10', time: '18:00', label: 'Admin / Email / Planning', category: 'admin', recurring: 'weekdays', completed: false, note: '' },
  { id: 's11', time: '19:00', label: 'Dinner + Personal Time', category: 'personal', recurring: 'daily', completed: false, note: '' },
  { id: 's12', time: '21:00', label: 'Wind Down + Review', category: 'personal', recurring: 'daily', completed: false, note: '' },
];

export const DEFAULT_REMINDERS = [
  { id: 'r1', label: 'Grooming', time: '08:00', repeat: 'daily', type: 'grooming' },
  { id: 'r2', label: 'Medicine', time: '09:00', repeat: 'daily', type: 'medicine' },
  { id: 'r3', label: 'Drink Water', time: '10:00', repeat: 'daily', type: 'water' },
  { id: 'r4', label: 'Sleep Reminder', time: '22:00', repeat: 'daily', type: 'sleep' },
];

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

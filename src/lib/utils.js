// Date/time formatting utilities

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getDateKey(date = new Date()) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function getWeekday(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getDayOfWeek(date = new Date()) {
  return date.getDay(); // 0=Sun, 6=Sat
}

export function formatDuration(minutes) {
  if (minutes < 1) return '< 1 min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function formatTimerDisplay(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function minutesBetween(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return (end - start) / 60000;
}

export function isToday(dateStr) {
  return dateStr === getDateKey();
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(date = new Date()) {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return getDateKey(d);
  });
}

export function getDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return getDateKey(d);
}

export function parseTimeString(timeStr) {
  // Parse "HH:MM" to { hours, minutes }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export function timeStringToDate(timeStr, baseDate = new Date()) {
  const { hours, minutes } = parseTimeString(timeStr);
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function isTimePast(timeStr) {
  const target = timeStringToDate(timeStr);
  return new Date() > target;
}

export function minutesUntil(timeStr) {
  const target = timeStringToDate(timeStr);
  return (target - new Date()) / 60000;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export function getScoreColor(score) {
  if (score >= 70) return 'var(--green-mid)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--pink-dark)';
}

export function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Needs Work';
  return 'Poor';
}

// Play a soft chime using Web Audio API
export function playChime(type = 'work') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'work') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.15); // C6
    } else {
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    }
    
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio not available
  }
}

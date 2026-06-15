// localStorage persistence layer
// Keys: accountability_profile, accountability_today, accountability_history,
//        accountability_timer, accountability_projects

const KEYS = {
  PROFILE: 'accountability_profile',
  TODAY: 'accountability_today',
  HISTORY: 'accountability_history',
  TIMER: 'accountability_timer',
  PROJECTS: 'accountability_projects',
};

export { KEYS };

export function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

export function clearData(key) {
  localStorage.removeItem(key);
}

export function clearAllData() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

export function exportAllData() {
  const data = {};
  Object.entries(KEYS).forEach(([name, key]) => {
    data[name] = loadData(key);
  });
  return data;
}

export function downloadJSON(data, filename = 'accountability_export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

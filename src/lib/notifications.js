// Browser Notification Manager

let permissionGranted = false;

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission !== 'denied') {
    const result = await Notification.requestPermission();
    permissionGranted = result === 'granted';
    return permissionGranted;
  }
  return false;
}

export function sendNotification(title, body, tag) {
  if (!permissionGranted && Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: tag || title,
      icon: '/vite.svg',
      silent: false,
    });
  } catch (e) {
    // Notification failed (maybe service worker needed)
  }
}

export function isNotificationPermitted() {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Schedule a notification at a specific time today
// Returns a timeout ID that can be cleared
export function scheduleNotification(timeStr, title, body, tag) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  const delay = target - now;
  if (delay <= 0) return null; // Time already passed

  return setTimeout(() => {
    sendNotification(title, body, tag);
  }, delay);
}

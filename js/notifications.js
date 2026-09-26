// ═══════════════════════════════════════════
// NOTIFICATIONS.JS
// ═══════════════════════════════════════════

function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function pushNotification(userId, type, title, message) {
  const notif = {
    id: genId('notif'),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  addNotification(notif);
  updateNotifBadge(userId);
  return notif;
}

function updateNotifBadge(userId) {
  const unread = getUserNotifications(userId).filter(n => !n.read).length;
  const badge = document.querySelector('.notif-count-badge');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline-flex' : 'none';
  }
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
}

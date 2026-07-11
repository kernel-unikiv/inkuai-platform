'use strict';
/* ── Toast Notification System ─────────────────────────────── */
(function () {
  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  const ICONS = {
    success: 'bi-check-circle-fill',
    error:   'bi-x-circle-fill',
    info:    'bi-info-circle-fill',
    warning: 'bi-exclamation-triangle-fill'
  };
  const ICON_COLORS = {
    success: '#16a34a', error: '#dc2626', info: '#2563eb', warning: '#d97706'
  };

  window.showToast = function (message, type = 'info', duration = 4500) {
    const container = getContainer();
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.innerHTML = `
      <i class="bi ${ICONS[type] || ICONS.info}" style="color:${ICON_COLORS[type]||ICON_COLORS.info};font-size:1rem;flex-shrink:0;margin-top:1px;"></i>
      <span class="toast-text">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0;margin-left:auto;font-size:1rem;line-height:1;flex-shrink:0;">×</button>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(110%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 320);
    }, duration);
  };

  // Shorthand helpers
  window.toast = {
    success: (m, d) => window.showToast(m, 'success', d),
    error:   (m, d) => window.showToast(m, 'error', d),
    info:    (m, d) => window.showToast(m, 'info', d),
    warning: (m, d) => window.showToast(m, 'warning', d),
  };

  if (document.readyState !== 'loading') getContainer();
  else document.addEventListener('DOMContentLoaded', getContainer);
})();

'use strict';

function initToast() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  window.showToast = function(message, type = 'info', duration = 4000) {
    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill' };
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}" style="color:var(--inkuai-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'})"></i><span style="font-size:0.875rem">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
  };
}

document.addEventListener('DOMContentLoaded', initToast);

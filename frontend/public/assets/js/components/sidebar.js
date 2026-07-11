'use strict';
/* ── Sidebar component — mobile toggle + active link + logout ── */
(function () {
  function init() {
    const sidebar  = document.getElementById('main-sidebar');
    const toggle   = document.getElementById('sidebar-toggle');
    const user     = window.InkuAuth?.getUser?.();

    // ── Populate user data attributes
    if (user) {
      document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = user.name || 'Utilizador'; });
      document.querySelectorAll('[data-user-role]').forEach(el => { el.textContent = user.role || 'student'; });
      document.querySelectorAll('[data-user-email]').forEach(el => { el.textContent = user.email || ''; });

      const initials = (user.name || 'U')[0].toUpperCase();
      document.querySelectorAll('#user-avatar, #topbar-avatar').forEach(el => {
        if (!el.querySelector('img')) el.textContent = initials;
      });

      if (user.role === 'admin') {
        document.querySelectorAll('#admin-link, #admin-mentors-btn').forEach(el => {
          if (el) el.style.display = '';
        });
      }
    }

    // ── Mark active link
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const isActive = href === path || (href !== '/' && path.startsWith(href.replace('.html', '')));
      link.classList.toggle('active', isActive);
    });

    // ── Mobile toggle
    if (toggle && sidebar) {
      let overlay = document.querySelector('.sidebar-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
      }

      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  }

  // ── Logout
  window.doLogout = function () {
    localStorage.removeItem('inkuai_token');
    localStorage.removeItem('inkuai_user');
    window.location.href = '/login.html';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

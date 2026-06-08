'use strict';
// ── Sidebar Component — PC / Tablet / Móvel ─────────────────
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Injectar overlay se não existir
    if (!document.querySelector('.sidebar-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.id = 'sidebar-overlay';
      overlay.onclick = closeSidebar;
      document.body.insertBefore(overlay, document.body.firstChild);
    }

    // Toggle button
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleSidebar);
    }

    // Auth: preencher dados do utilizador
    const usr = window.InkuAuth?.getUser?.();
    if (usr) {
      document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = usr.name || '');
      document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = usr.role || '');
      document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = usr.email || '');
    }

    // Marcar link activo automaticamente
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if (link.getAttribute('href') === path) {
        link.classList.add('active');
      }
    });

    // Fechar sidebar ao redimensionar para desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) closeSidebar();
    });
  });

  function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    isOpen ? closeSidebar() : openSidebar();
  }

  function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.add('open');
    overlay?.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }

  // doLogout global
  window.doLogout = function() {
    window.InkuAuth?.logout?.();
    localStorage.removeItem('inkuai_token');
    localStorage.removeItem('inkuai_user');
    window.location.href = '/login.html';
  };

  window.toggleSidebar  = toggleSidebar;
  window.openSidebar    = openSidebar;
  window.closeSidebar   = closeSidebar;
})();

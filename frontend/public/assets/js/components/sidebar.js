'use strict';

function initSidebar() {
  const user = window.InkuAuth?.getUser();
  if (!user) return;

  // Preencher user info no sidebar
  const nameEls = document.querySelectorAll('[data-user-name]');
  const roleEls = document.querySelectorAll('[data-user-role]');
  const emailEls = document.querySelectorAll('[data-user-email]');

  nameEls.forEach(el => el.textContent = user.name || 'Utilizador');
  roleEls.forEach(el => el.textContent = user.role || 'student');
  emailEls.forEach(el => el.textContent = user.email || '');

  // Activar link actual
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (path.includes(link.getAttribute('href'))) link.classList.add('active');
  });

  // Toggle mobile
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

// Logout
window.doLogout = async function() {
  try { await window.InkuAPI?.post('/auth/logout'); } catch {}
  window.InkuAuth?.clearAuth();
  window.location.href = '/pages/login.html';
};

document.addEventListener('DOMContentLoaded', initSidebar);

'use strict';
// INKU·AI — Main JS entry point
// Contador animado
function animateCounter(el, target) {
  let current = 0;
  const step = Math.max(1, Math.floor(target / 60));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 25);
}

document.addEventListener('DOMContentLoaded', () => {
  // Animar contadores da landing
  document.querySelectorAll('[data-count]').forEach(el => {
    animateCounter(el, parseInt(el.dataset.count) || 0);
  });

  // Proteger páginas autenticadas
  const protectedPaths = ['dashboard','projects','startups','sandbox','profile','admin','mentorship'];
  const isProtected = protectedPaths.some(p => window.location.pathname.includes(p));
  if (isProtected && !window.InkuAuth?.getToken()) {
    window.location.href = '/login.html';
  }
});

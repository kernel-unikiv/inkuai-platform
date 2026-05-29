'use strict';

// ─── Login ───────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>A entrar...';
    try {
      const data = await window.InkuAPI.post('/auth/login', {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      });
      window.InkuAuth.setAuth(data.token, data.user);
      window.showToast?.('Login realizado com sucesso!', 'success');
      setTimeout(() => { window.location.href = '/pages/dashboard.html'; }, 800);
    } catch (err) {
      window.showToast?.(err.message || 'Erro no login.', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar';
    }
  });
}

// ─── Register ────────────────────────────────────
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm-password')?.value;
    if (confirm && password !== confirm) { window.showToast?.('As passwords não coincidem.', 'error'); return; }
    const btn = registerForm.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>A criar conta...';
    try {
      await window.InkuAPI.post('/auth/register', {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password,
        role: document.getElementById('role')?.value || 'student',
        institution: document.getElementById('institution')?.value || 'IP/UNIKIVI'
      });
      window.showToast?.('Conta criada com sucesso! Verifique o seu email.', 'success');
      setTimeout(() => { window.location.href = '/pages/login.html'; }, 1500);
    } catch (err) {
      const msg = err.errors ? err.errors.map(e => e.message).join(', ') : err.message;
      window.showToast?.(msg, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Criar Conta';
    }
  });
}

// ─── Redirect se já autenticado ──────────────────
if ((loginForm || registerForm) && window.InkuAuth?.getToken()) {
  window.location.href = '/pages/dashboard.html';
}

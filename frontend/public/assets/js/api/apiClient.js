'use strict';
/* ── INKU·AI API Client ─────────────────────────────────────────
   Base URL auto-detects dev vs prod.
   Exposes: InkuAPI.get/post/put/patch/delete
   Exposes: InkuAuth.getUser/getToken/isLoggedIn/logout
─────────────────────────────────────────────────────────────── */

const BASE_URL = '/api/v1';
const TOKEN_KEY = 'inkuai_token';
const USER_KEY  = 'inkuai_user';

/* ── Auth helper ─────────────────────────────────────────────── */
window.InkuAuth = {
  getToken:  ()      => localStorage.getItem(TOKEN_KEY),
  getUser:   ()      => { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null; } catch { return null; } },
  setUser:   (u)     => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  setToken:  (t)     => localStorage.setItem(TOKEN_KEY, t),
  // setAuth — called by auth.js after login
  setAuth:   (t, u)  => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  },
  isLoggedIn:()      => !!localStorage.getItem(TOKEN_KEY),
  logout:    ()      => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); window.location.href = '/login.html'; }
};

/* ── Core fetch wrapper ──────────────────────────────────────── */
async function apiFetch(method, path, body) {
  const token = InkuAuth.getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    throw new Error(`Resposta inesperada do servidor (${res.status})`);
  }

  if (res.status === 401) {
    // Token expirado ou inválido
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login.html';
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Erro ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/* ── Public API ──────────────────────────────────────────────── */
window.InkuAPI = {
  get:    (path)         => apiFetch('GET',    path),
  post:   (path, body)   => apiFetch('POST',   path, body),
  put:    (path, body)   => apiFetch('PUT',    path, body),
  patch:  (path, body)   => apiFetch('PATCH',  path, body ?? {}),
  delete: (path)         => apiFetch('DELETE', path),
};

/* ── Auto-redirect if not logged in (skip auth pages) ────────── */
(function () {
  const pub = ['/login', '/register', '/forgot-password', '/index', '/404', '/#', '/index.html'];
  const path = window.location.pathname;
  const isPublic = path === '/' || pub.some(p => path.includes(p));
  if (!isPublic && !InkuAuth.isLoggedIn()) {
    window.location.href = '/login.html';
  }
})();

'use strict';
// ── Componente de Notificações Global ────────────────────────────────────
// Injecta sino + dropdown em qualquer topbar com id="notif-mount"
// CORRIGIDO: dropdown controlado manualmente (não depende de data-bs-toggle
// do Bootstrap, que falha em HTML injectado dinamicamente via innerHTML).

(function() {
  const POLL_INTERVAL = 60000;
  let isOpen = false;

  function injectBell() {
    const mount = document.getElementById('notif-mount');
    if (!mount || mount.dataset.injected) return;
    mount.dataset.injected = 'true';

    mount.innerHTML = `
      <div class="notif-wrap" style="position:relative">
        <button type="button" class="notif-bell-btn" id="global-notif-btn" aria-label="Notificações" aria-haspopup="true" aria-expanded="false">
          <i class="bi bi-bell" style="font-size:1.05rem"></i>
          <span id="global-notif-badge" class="notif-badge-dot" style="display:none">0</span>
        </button>
        <div class="notif-panel" id="global-notif-dropdown" role="menu">
          <div class="notif-panel-head">
            <strong>Notificações</strong>
            <div class="notif-panel-actions">
              <a href="/messages.html"><i class="bi bi-chat-dots"></i> Mensagens</a>
              <button type="button" id="notif-mark-all">Limpar tudo</button>
            </div>
          </div>
          <div id="global-notif-list" class="notif-panel-list">
            <div class="notif-panel-loading"><div class="spinner-border spinner-border-sm"></div></div>
          </div>
          <div class="notif-panel-foot">
            <a href="/messages.html">Ver todas as mensagens →</a>
          </div>
        </div>
      </div>`;

    injectStylesOnce();

    const btn = document.getElementById('global-notif-btn');
    const panel = document.getElementById('global-notif-dropdown');

    // Controlo manual de abrir/fechar — fiável em qualquer página, mesmo
    // quando o componente é injectado depois do bootstrap.bundle.js correr.
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen ? closePanel() : openPanel();
    });
    document.getElementById('notif-mark-all')?.addEventListener('click', (e) => {
      e.stopPropagation();
      readAll();
    });
    document.addEventListener('click', (e) => {
      if (isOpen && !panel.contains(e.target) && !btn.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
  }

  function openPanel() {
    const panel = document.getElementById('global-notif-dropdown');
    const btn = document.getElementById('global-notif-btn');
    if (!panel) return;
    panel.classList.add('show');
    btn?.setAttribute('aria-expanded', 'true');
    isOpen = true;
    loadList();
  }
  function closePanel() {
    document.getElementById('global-notif-dropdown')?.classList.remove('show');
    document.getElementById('global-notif-btn')?.setAttribute('aria-expanded', 'false');
    isOpen = false;
  }

  function injectStylesOnce() {
    if (document.getElementById('notif-component-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-component-styles';
    style.textContent = `
      .notif-bell-btn {
        position: relative; width: 36px; height: 36px; border-radius: var(--radius-sm,8px);
        background: transparent; border: none; color: var(--text-secondary,#6e7681);
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        transition: background .15s, color .15s;
      }
      .notif-bell-btn:hover { background: var(--gray-50,#f7f9fc); color: var(--text-primary,#0d1117); }
      .notif-bell-btn[aria-expanded="true"] { background: var(--brand-50,#f3f7ff); color: var(--brand-600,#2354a8); }
      .notif-badge-dot {
        position: absolute; top: 3px; right: 3px; min-width: 16px; height: 16px;
        background: var(--danger-500,#dc2626); color: #fff; border-radius: 999px;
        font-size: .625rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
        padding: 0 4px; border: 2px solid #fff;
      }
      .notif-panel {
        position: absolute; top: calc(100% + 8px); right: 0; width: 360px; max-width: calc(100vw - 32px);
        background: #fff; border: 1px solid var(--border-subtle,#e2e8f0); border-radius: var(--radius-md,10px);
        box-shadow: var(--shadow-lg, 0 12px 24px rgba(13,17,23,.12)); z-index: 1050;
        opacity: 0; visibility: hidden; transform: translateY(-6px);
        transition: opacity .15s ease, transform .15s ease, visibility .15s;
        max-height: 460px; display: flex; flex-direction: column; overflow: hidden;
      }
      .notif-panel.show { opacity: 1; visibility: visible; transform: translateY(0); }
      .notif-panel-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px; border-bottom: 1px solid var(--border-subtle,#e2e8f0); flex-shrink: 0;
      }
      .notif-panel-head strong { font-size: .875rem; color: var(--text-primary,#0d1117); }
      .notif-panel-actions { display: flex; align-items: center; gap: 12px; }
      .notif-panel-actions a { font-size: .75rem; color: var(--brand-600,#2354a8); text-decoration: none; }
      .notif-panel-actions button {
        font-size: .75rem; color: var(--text-tertiary,#8b949e); background: none; border: none; cursor: pointer;
      }
      .notif-panel-actions button:hover { color: var(--text-primary,#0d1117); }
      .notif-panel-list { flex: 1; overflow-y: auto; }
      .notif-panel-loading { text-align: center; padding: 24px 0; color: var(--text-tertiary,#8b949e); }
      .notif-panel-foot { padding: 8px; text-align: center; border-top: 1px solid var(--border-subtle,#e2e8f0); flex-shrink: 0; }
      .notif-panel-foot a { font-size: .75rem; color: var(--brand-600,#2354a8); text-decoration: none; }
      .notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background .12s; border-bottom: 1px solid var(--border-subtle,#f1f5f9); }
      .notif-item:hover { background: var(--gray-50,#f7f9fc); }
      .notif-item.unread { background: var(--brand-50,#f3f7ff); }
      .notif-item-icon { flex-shrink: 0; margin-top: 2px; }
      .notif-item-title { font-size: .8125rem; color: var(--text-primary,#0d1117); }
      .notif-item-msg { font-size: .75rem; color: var(--text-secondary,#6e7681); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .notif-item-time { font-size: .6875rem; color: var(--text-tertiary,#8b949e); margin-top: 3px; }
      .notif-item-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-500,#2563eb); flex-shrink: 0; margin-top: 5px; }
      @media (max-width: 480px) {
        .notif-panel { position: fixed; top: 60px; right: 8px; left: 8px; width: auto; }
      }
    `;
    document.head.appendChild(style);
  }

  async function refreshBadge() {
    try {
      const res = await window.InkuAPI.get('/notifications?unread_only=true&limit=1');
      const count = res.pagination?.total || 0;
      const badge = document.getElementById('global-notif-badge');
      if (badge) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
      const msgRes = await window.InkuAPI.get('/messages?type=inbox&limit=50');
      const unread = (msgRes.data || []).filter(m => !m.is_read).length;
      document.querySelectorAll('.msg-unread-badge').forEach(el => {
        el.textContent = unread;
        el.style.display = unread > 0 ? '' : 'none';
      });
    } catch {}
  }

  async function loadList() {
    const list = document.getElementById('global-notif-list');
    if (!list) return;
    list.innerHTML = '<div class="notif-panel-loading"><div class="spinner-border spinner-border-sm"></div></div>';
    try {
      const res = await window.InkuAPI.get('/notifications?limit=15');
      const notifs = res.data || [];
      const typeIcon  = { success:'bi-check-circle-fill', error:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill' };
      const typeColor = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
      if (!notifs.length) {
        list.innerHTML = '<div class="notif-panel-loading"><i class="bi bi-bell-slash" style="font-size:1.6rem;display:block;margin-bottom:8px"></i>Sem notificações.</div>';
        return;
      }
      list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-url="${(n.action_url||'').replace(/"/g,'')}">
          <i class="bi ${typeIcon[n.type]||'bi-info-circle-fill'} notif-item-icon" style="color:${typeColor[n.type]||'#2563eb'}"></i>
          <div style="flex:1;min-width:0">
            <div class="notif-item-title">${n.title}</div>
            <div class="notif-item-msg">${n.message||''}</div>
            <div class="notif-item-time">${new Date(n.created_at).toLocaleString('pt-PT')}</div>
          </div>
          ${!n.is_read ? '<div class="notif-item-dot"></div>' : ''}
        </div>`).join('');
      list.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', () => clickNotif(el.dataset.id, el.dataset.url));
      });
    } catch (err) {
      list.innerHTML = `<div class="notif-panel-loading" style="color:var(--danger-500,#dc2626)">${err.message}</div>`;
    }
  }

  async function clickNotif(id, url) {
    try { await window.InkuAPI.patch(`/notifications/${id}/read`); } catch {}
    refreshBadge();
    if (url && url !== 'undefined' && url.startsWith('/')) window.location.href = url;
    else loadList();
  }

  async function readAll() {
    try { await window.InkuAPI.patch('/notifications/read-all'); refreshBadge(); loadList(); } catch {}
  }

  window.NotifComponent = { load: loadList, refresh: refreshBadge, click: clickNotif, readAll };

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.InkuAuth?.getToken()) return;
    injectBell();
    refreshBadge();
    setInterval(refreshBadge, POLL_INTERVAL);
  });
})();

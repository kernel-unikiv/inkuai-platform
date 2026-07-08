
// Z-index fix — notification dropdown must appear above sidebar (z-index:1000)
(function() {
  const style = document.createElement('style');
  style.id = 'global-notif-zfix';
  style.textContent = '#global-notif-dropdown, .notif-dropdown { z-index: 1060 !important; position: absolute !important; } .modal { z-index: 1065 !important; } .modal-backdrop { z-index: 1055 !important; }';
  document.head.appendChild(style);
})();
'use strict';
// ── Componente de Notificações Global ───────────────────────────────────────
// Injeta sino + dropdown em qualquer topbar que tenha id="notif-mount"
// e actualiza badges de mensagens não lidas

(function() {
  const POLL_INTERVAL = 60000; // 60 segundos

  // ── Injectar HTML do sino no topbar ──────────────────────
  function injectBell() {
    const mount = document.getElementById('notif-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div class="dropdown me-2">
        <button class="btn btn-link p-1 position-relative" data-bs-toggle="dropdown"
          id="global-notif-btn" onclick="window.NotifComponent.load()" style="color:var(--text-muted)">
          <i class="bi bi-bell-fill fs-5"></i>
          <span id="global-notif-badge"
            class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style="display:none;font-size:0.6rem;min-width:18px">0</span>
        </button>
        <div class="dropdown-menu dropdown-menu-end p-0 shadow" style="width:340px;max-height:420px;overflow-y:auto" id="global-notif-dropdown">
          <div class="d-flex align-items-center justify-content-between px-3 py-2"
            style="border-bottom:1px solid var(--border-light);position:sticky;top:0;background:#fff;z-index:1">
            <strong style="font-size:0.875rem;color:var(--text-primary)">Notificações</strong>
            <div class="d-flex gap-2">
              <a href="/messages.html" style="font-size:0.78rem;color:var(--blue-600);text-decoration:none">
                <i class="bi bi-chat-dots me-1"></i>Mensagens
              </a>
              <button onclick="window.NotifComponent.readAll()" class="btn btn-link p-0"
                style="font-size:0.75rem;color:var(--text-muted);text-decoration:none">
                Limpar tudo
              </button>
            </div>
          </div>
          <div id="global-notif-list">
            <div class="text-center py-3 text-muted" style="font-size:0.82rem">
              <div class="spinner-border spinner-border-sm"></div>
            </div>
          </div>
          <div class="text-center py-2" style="border-top:1px solid var(--border-light)">
            <a href="/messages.html" style="font-size:0.78rem;color:var(--blue-600);text-decoration:none">
              Ver todas as mensagens →
            </a>
          </div>
        </div>
      </div>`;
  }

  // ── Actualizar badge de não lidas ─────────────────────────
  async function refreshBadge() {
    try {
      const res = await window.InkuAPI.get('/notifications?unread_only=true&limit=1');
      const count = res.pagination?.total || 0;
      const badge = document.getElementById('global-notif-badge');
      if (badge) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = count > 0 ? '' : 'none';
      }
      // Badge de mensagens não lidas na sidebar
      const msgRes = await window.InkuAPI.get('/messages?type=inbox&limit=50');
      const unread = (msgRes.data || []).filter(m => !m.is_read).length;
      document.querySelectorAll('.msg-unread-badge').forEach(el => {
        el.textContent = unread;
        el.style.display = unread > 0 ? '' : 'none';
      });
    } catch {}
  }

  // ── Carregar lista de notificações ────────────────────────
  async function loadList() {
    const list = document.getElementById('global-notif-list');
    if (!list) return;
    try {
      const res    = await window.InkuAPI.get('/notifications?limit=15');
      const notifs = res.data || [];
      const typeIcon  = { success:'bi-check-circle-fill', error:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill' };
      const typeColor = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
      if (!notifs.length) {
        list.innerHTML = '<div class="text-center py-4 text-muted" style="font-size:0.82rem"><i class="bi bi-bell-slash d-block mb-2 fs-3"></i>Sem notificações.</div>';
        return;
      }
      list.innerHTML = notifs.map(n => `
        <div onclick="window.NotifComponent.click('${n.id}','${(n.action_url||'').replace(/'/g,'')}')"
          class="d-flex align-items-start gap-2 px-3 py-2"
          style="cursor:pointer;background:${n.is_read?'transparent':'var(--blue-50)'};border-bottom:1px solid var(--border-light);transition:background .15s"
          onmouseenter="this.style.background='var(--bg-page)'"
          onmouseleave="this.style.background='${n.is_read?'transparent':'var(--blue-50)'}'">
          <i class="bi ${typeIcon[n.type]||'bi-info-circle-fill'} flex-shrink-0 mt-1"
            style="color:${typeColor[n.type]||'#2563eb'}"></i>
          <div style="flex:1;overflow:hidden">
            <div style="font-weight:${n.is_read?'400':'600'};font-size:0.82rem;color:var(--text-primary)">${n.title}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:1px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.message||''}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">${new Date(n.created_at).toLocaleString('pt-PT')}</div>
          </div>
          ${!n.is_read ? '<div style="width:7px;height:7px;border-radius:50%;background:#2563eb;flex-shrink:0;margin-top:5px"></div>' : ''}
        </div>`).join('');
    } catch(err) {
      list.innerHTML = `<div class="text-center py-3 text-danger" style="font-size:0.82rem">${err.message}</div>`;
    }
  }

  // ── Clicar em notificação ─────────────────────────────────
  async function clickNotif(id, url) {
    try { await window.InkuAPI.patch(`/notifications/${id}/read`); } catch {}
    refreshBadge();
    if (url && url !== 'undefined' && url.startsWith('/')) window.location.href = url;
    else loadList();
  }

  // ── Marcar todas como lidas ───────────────────────────────
  async function readAll() {
    try {
      await window.InkuAPI.patch('/notifications/read-all');
      refreshBadge();
      loadList();
    } catch {}
  }

  // ── API pública ───────────────────────────────────────────
  window.NotifComponent = { load: loadList, refresh: refreshBadge, click: clickNotif, readAll };

  // ── Auto-init ao carregar ─────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.InkuAuth?.getToken()) return;
    injectBell();
    refreshBadge();
    setInterval(refreshBadge, POLL_INTERVAL);
  });
})();

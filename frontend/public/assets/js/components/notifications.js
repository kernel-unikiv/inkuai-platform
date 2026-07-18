'use strict';
/* ── Global Notification Bell ──────────────────────────────────
   FIX: dropdown-menu NÃO pode ter display:flex inline — Bootstrap
   usa display:block/none para toggle. Usar classe CSS separada.
─────────────────────────────────────────────────────────────── */

// Z-index fix injected immediately
(function () {
  const s = document.createElement('style');
  s.id = 'inkuai-zfix';
  s.textContent = `
    /* Notification dropdown — acima sidebar (900) e topbar (950) */
    #global-notif-dropdown {
      z-index: 1000 !important;
      min-width: 360px !important;
      padding: 0 !important;
      border-radius: 14px !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 20px 40px rgba(0,0,0,0.14) !important;
      overflow: hidden !important;
    }
    /* CRÍTICO: não usar display:flex aqui — Bootstrap controla display */
    #global-notif-dropdown .notif-inner {
      display: flex;
      flex-direction: column;
      max-height: 460px;
    }
    #global-notif-list {
      overflow-y: auto;
      flex: 1;
      max-height: 320px;
    }
    /* Modal e overlays acima de tudo */
    .modal         { z-index: 1040 !important; }
    .modal-backdrop{ z-index: 1030 !important; }
    .offcanvas     { z-index: 1040 !important; }
    .offcanvas-backdrop { z-index: 1030 !important; }
    .tooltip       { z-index: 1060 !important; }
    .popover       { z-index: 1050 !important; }
  `;
  document.head.appendChild(s);
})();

(function () {
  const POLL_MS = 45000;

  function timeAgo(iso) {
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60)    return d + 's atrás';
    if (d < 3600)  return Math.floor(d/60) + 'm atrás';
    if (d < 86400) return Math.floor(d/3600) + 'h atrás';
    return Math.floor(d/86400) + 'd atrás';
  }

  const ICON  = { success:'bi-check-circle-fill', error:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill' };
  const COLOR = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };

  function injectBell() {
    const mount = document.getElementById('notif-mount');
    if (!mount || mount.querySelector('#global-notif-btn')) return;

    // IMPORTANTE: dropdown-menu sem display inline — Bootstrap controla
    mount.innerHTML = `
    <div class="dropdown">
      <button class="btn btn-link p-1 position-relative d-flex align-items-center"
        id="global-notif-btn"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
        aria-expanded="false"
        style="color:var(--text-muted);text-decoration:none;outline:none;box-shadow:none;"
        title="Notificações">
        <i class="bi bi-bell" style="font-size:1.1rem;"></i>
        <span id="global-notif-badge"
          style="position:absolute;top:0;right:0;
                 background:#dc2626;color:#fff;font-size:0.58rem;font-weight:700;
                 min-width:16px;height:16px;border-radius:99px;
                 display:none;align-items:center;justify-content:center;
                 padding:0 3px;border:1.5px solid #fff;line-height:1;">0</span>
      </button>
      <div class="dropdown-menu dropdown-menu-end" id="global-notif-dropdown">
        <div class="notif-inner">
          <!-- Header -->
          <div style="padding:13px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#fff;flex-shrink:0;">
            <span style="font-weight:700;font-size:0.9rem;color:#0f172a;">Notificações</span>
            <div style="display:flex;gap:12px;align-items:center;">
              <button onclick="window.NotifComponent.readAll()" style="background:none;border:none;font-size:0.75rem;color:#64748b;cursor:pointer;padding:0;display:flex;align-items:center;gap:4px;">
                <i class="bi bi-check2-all"></i>Ler todas
              </button>
              <a href="/messages.html" style="font-size:0.75rem;color:#2563eb;text-decoration:none;">
                <i class="bi bi-chat-dots me-1"></i>Msgs
              </a>
            </div>
          </div>
          <!-- Filter tabs -->
          <div style="display:flex;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0;">
            <button class="notif-tab" data-filter="all"
              onclick="window.NotifComponent.setFilter('all',this)"
              style="flex:1;padding:8px 4px;font-size:0.75rem;font-weight:600;background:none;border:none;border-bottom:2px solid #2563eb;color:#2563eb;cursor:pointer;">
              Todas
            </button>
            <button class="notif-tab" data-filter="unread"
              onclick="window.NotifComponent.setFilter('unread',this)"
              style="flex:1;padding:8px 4px;font-size:0.75rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;color:#94a3b8;cursor:pointer;">
              Não lidas
            </button>
          </div>
          <!-- List -->
          <div id="global-notif-list">
            <div style="text-align:center;padding:24px;color:#94a3b8;">
              <div class="spinner-border spinner-border-sm"></div>
            </div>
          </div>
          <!-- Footer -->
          <div style="padding:10px 16px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0;text-align:center;">
            <a href="/messages.html" style="font-size:0.78rem;color:#2563eb;text-decoration:none;">Ver todas as mensagens →</a>
          </div>
        </div>
      </div>
    </div>`;

    // Load notifications when dropdown opens
    const btn = document.getElementById('global-notif-btn');
    btn?.addEventListener('show.bs.dropdown', () => window.NotifComponent.load());
  }

  let currentFilter = 'all';

  async function refreshBadge() {
    const token = localStorage.getItem('inkuai_token');
    if (!token) return;
    try {
      const res = await window.InkuAPI.get('/notifications?unread_only=true&limit=1');
      const count = res.pagination?.total ?? 0;
      const badge = document.getElementById('global-notif-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    } catch {}

    // Messages unread badge
    try {
      const mRes = await window.InkuAPI.get('/messages?type=inbox&limit=50');
      const unread = (mRes.data || []).filter(m => !m.is_read).length;
      document.querySelectorAll('.msg-unread-badge').forEach(el => {
        el.textContent = unread;
        el.style.display = unread > 0 ? 'inline-flex' : 'none';
      });
    } catch {}
  }

  async function loadList() {
    const list = document.getElementById('global-notif-list');
    if (!list) return;
    const qs = currentFilter === 'unread' ? 'unread_only=true&' : '';
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;"><div class="spinner-border spinner-border-sm"></div></div>';
    try {
      const res = await window.InkuAPI.get(`/notifications?${qs}limit=20`);
      const notifs = res.data || [];
      if (!notifs.length) {
        list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:#94a3b8;">
          <i class="bi bi-bell-slash" style="font-size:1.8rem;display:block;margin-bottom:8px;opacity:0.4;"></i>
          <span style="font-size:0.82rem;">${currentFilter === 'unread' ? 'Sem notificações não lidas' : 'Sem notificações'}</span>
        </div>`;
        return;
      }
      list.innerHTML = notifs.map(n => `
        <div onclick="window.NotifComponent.click('${n.id}','${(n.action_url||'').replace(/'/g,"\\'")}')"
          style="display:flex;align-items:flex-start;gap:10px;padding:11px 14px;cursor:pointer;
                 background:${n.is_read ? '#fff' : '#eff6ff'};
                 border-bottom:1px solid #f1f5f9;transition:background .1s;"
          onmouseenter="this.style.background='#f8fafc'"
          onmouseleave="this.style.background='${n.is_read ? '#fff' : '#eff6ff'}'">
          <div style="width:28px;height:28px;border-radius:50%;
                      background:${COLOR[n.type] || COLOR.info}18;
                      display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
            <i class="bi ${ICON[n.type] || ICON.info}" style="color:${COLOR[n.type] || COLOR.info};font-size:0.8rem;"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:${n.is_read ? 500 : 700};font-size:0.82rem;color:#0f172a;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.title}</div>
            <div style="font-size:0.75rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.message || ''}</div>
            <div style="font-size:0.67rem;color:#94a3b8;margin-top:3px;">${timeAgo(n.created_at)}</div>
          </div>
          ${!n.is_read ? `<div style="width:7px;height:7px;border-radius:50%;background:#2563eb;flex-shrink:0;margin-top:4px;"></div>` : ''}
        </div>`).join('');
    } catch(e) {
      list.innerHTML = `<div style="text-align:center;padding:20px;color:#dc2626;font-size:0.82rem;">${e.message}</div>`;
    }
  }

  async function clickNotif(id, url) {
    try { await window.InkuAPI.patch(`/notifications/${id}/read`); } catch {}
    refreshBadge();
    loadList();
    if (url && url !== 'undefined' && url.startsWith('/')) {
      const btn = document.getElementById('global-notif-btn');
      if (btn) { try { bootstrap.Dropdown.getInstance(btn)?.hide(); } catch {} }
      setTimeout(() => { window.location.href = url; }, 120);
    }
  }

  async function readAll() {
    try {
      await window.InkuAPI.patch('/notifications/read-all');
      const badge = document.getElementById('global-notif-badge');
      if (badge) badge.style.display = 'none';
      loadList();
    } catch {}
  }

  function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.notif-tab').forEach(t => {
      const isActive = t.dataset.filter === filter;
      t.style.borderBottomColor = isActive ? '#2563eb' : 'transparent';
      t.style.color = isActive ? '#2563eb' : '#94a3b8';
      t.style.fontWeight = isActive ? '700' : '600';
    });
    loadList();
  }

  window.NotifComponent = {
    load: loadList, refresh: refreshBadge,
    click: clickNotif, readAll, setFilter
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('inkuai_token')) return;
    injectBell();
    refreshBadge();
    setInterval(refreshBadge, POLL_MS);
  });
})();

'use strict';
/* ── Global Notification Component ──────────────────────────────
   Injects bell + dropdown into #notif-mount on every page.
   Z-index fixed to always appear above sidebar (z-index:900).
─────────────────────────────────────────────────────────────── */

// Inject z-index fix immediately
(function () {
  const s = document.createElement('style');
  s.id = 'inkuai-zfix';
  s.textContent = [
    '#global-notif-dropdown{z-index:1000!important;}',
    '.modal{z-index:1040!important;}',
    '.modal-backdrop{z-index:1030!important;}',
    '.offcanvas{z-index:1040!important;}',
    '.offcanvas-backdrop{z-index:1030!important;}'
  ].join('');
  document.head.appendChild(s);
})();

(function () {
  const POLL_MS = 45000;

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)    return `${diff}s`;
    if (diff < 3600)  return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  }

  function injectBell() {
    const mount = document.getElementById('notif-mount');
    if (!mount || mount.querySelector('#global-notif-btn')) return;

    mount.innerHTML = `
    <div class="dropdown" style="position:relative;">
      <button class="btn btn-link p-1 position-relative d-flex align-items-center"
        id="global-notif-btn"
        data-bs-toggle="dropdown" data-bs-auto-close="outside"
        aria-expanded="false"
        style="color:var(--text-muted);text-decoration:none;"
        title="Notificações">
        <i class="bi bi-bell" style="font-size:1.1rem;"></i>
        <span id="global-notif-badge"
          style="display:none;position:absolute;top:0;right:0;
                 background:#dc2626;color:#fff;font-size:0.58rem;font-weight:700;
                 min-width:16px;height:16px;border-radius:99px;
                 display:none;align-items:center;justify-content:center;
                 padding:0 3px;border:1.5px solid #fff;line-height:1;"
          id="global-notif-badge">0</span>
      </button>
      <div class="dropdown-menu dropdown-menu-end p-0"
           id="global-notif-dropdown"
           style="width:360px;max-height:460px;display:flex;flex-direction:column;
                  border-radius:14px;border:1px solid var(--border-light);
                  box-shadow:0 20px 40px rgba(0,0,0,0.12);overflow:hidden;">
        <!-- Header -->
        <div style="padding:14px 16px;border-bottom:1px solid var(--border-light);
                    display:flex;align-items:center;justify-content:space-between;
                    background:#fff;flex-shrink:0;">
          <span style="font-weight:700;font-size:0.9rem;color:var(--text-primary);">Notificações</span>
          <div style="display:flex;gap:10px;align-items:center;">
            <button onclick="window.NotifComponent.readAll()" class="btn btn-link p-0"
              style="font-size:0.75rem;color:var(--text-muted);text-decoration:none;">
              <i class="bi bi-check2-all me-1"></i>Ler todas
            </button>
            <a href="/messages.html" style="font-size:0.75rem;color:var(--brand-primary);text-decoration:none;">
              <i class="bi bi-chat-dots me-1"></i>Mensagens
            </a>
          </div>
        </div>
        <!-- Filter tabs -->
        <div style="display:flex;border-bottom:1px solid var(--border-light);background:#fff;flex-shrink:0;">
          <button class="notif-tab active" data-filter="all"    onclick="window.NotifComponent.setFilter('all',this)"    style="flex:1;padding:8px;font-size:0.75rem;font-weight:600;background:none;border:none;border-bottom:2px solid var(--brand-primary);color:var(--brand-primary);cursor:pointer;">Todas</button>
          <button class="notif-tab"        data-filter="unread" onclick="window.NotifComponent.setFilter('unread',this)" style="flex:1;padding:8px;font-size:0.75rem;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;">Não lidas</button>
        </div>
        <!-- List -->
        <div id="global-notif-list" style="overflow-y:auto;flex:1;background:#fff;">
          <div style="text-align:center;padding:24px;color:var(--text-muted);">
            <div class="spinner-border spinner-border-sm"></div>
          </div>
        </div>
        <!-- Footer -->
        <div style="padding:10px 16px;border-top:1px solid var(--border-light);background:#f8fafc;flex-shrink:0;text-align:center;">
          <a href="/messages.html" style="font-size:0.78rem;color:var(--brand-primary);text-decoration:none;">Ver todas as mensagens →</a>
        </div>
      </div>
    </div>`;

    // Load on open
    const btn = document.getElementById('global-notif-btn');
    btn?.addEventListener('show.bs.dropdown', () => window.NotifComponent.load());
  }

  let currentFilter = 'all';

  async function refreshBadge() {
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
      // Sidebar messages badge
      try {
        const mRes = await window.InkuAPI.get('/messages?type=inbox&limit=99');
        const unread = (mRes.data || []).filter(m => !m.is_read).length;
        document.querySelectorAll('.msg-unread-badge').forEach(el => {
          el.textContent = unread;
          el.style.display = unread > 0 ? '' : 'none';
        });
      } catch {}
    } catch {}
  }

  const TYPE_ICON  = { success:'bi-check-circle-fill', error:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill' };
  const TYPE_COLOR = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };

  async function loadList() {
    const list = document.getElementById('global-notif-list');
    if (!list) return;
    const qs = currentFilter === 'unread' ? 'unread_only=true&' : '';
    try {
      const res = await window.InkuAPI.get(`/notifications?${qs}limit=20`);
      const notifs = res.data || [];
      if (!notifs.length) {
        list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--text-muted);">
          <i class="bi bi-bell-slash" style="font-size:2rem;display:block;margin-bottom:10px;opacity:0.4;"></i>
          <span style="font-size:0.845rem;">${currentFilter==='unread'?'Nenhuma notificação não lida':'Sem notificações'}</span>
        </div>`;
        return;
      }
      list.innerHTML = notifs.map(n => `
        <div onclick="window.NotifComponent.click('${n.id}','${(n.action_url||'').replace(/'/g,'\\\'')}')"
          style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;cursor:pointer;
                 background:${n.is_read?'#fff':'#eff6ff'};
                 border-bottom:1px solid var(--border-light);transition:background .12s;"
          onmouseenter="this.style.background='#f8fafc'"
          onmouseleave="this.style.background='${n.is_read?'#fff':'#eff6ff'}'">
          <div style="width:30px;height:30px;border-radius:50%;background:${TYPE_COLOR[n.type]||'#2563eb'}18;
                      display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
            <i class="bi ${TYPE_ICON[n.type]||'bi-info-circle-fill'}" style="color:${TYPE_COLOR[n.type]||'#2563eb'};font-size:0.85rem;"></i>
          </div>
          <div style="flex:1;overflow:hidden;min-width:0;">
            <div style="font-weight:${n.is_read?500:700};font-size:0.835rem;color:var(--text-primary);margin-bottom:2px;">${n.title}</div>
            <div style="font-size:0.77rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.message||''}</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:3px;">${timeAgo(n.created_at)} atrás</div>
          </div>
          ${!n.is_read ? `<div style="width:7px;height:7px;border-radius:50%;background:var(--brand-primary);flex-shrink:0;margin-top:5px;"></div>` : ''}
        </div>`).join('');
    } catch(e) {
      list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);font-size:0.82rem;">${e.message}</div>`;
    }
  }

  async function clickNotif(id, url) {
    try { await window.InkuAPI.patch(`/notifications/${id}/read`); } catch {}
    await refreshBadge();
    loadList();
    if (url && url !== 'undefined' && url.startsWith('/')) {
      // close dropdown first
      const btn = document.getElementById('global-notif-btn');
      if (btn) bootstrap.Dropdown.getInstance(btn)?.hide();
      setTimeout(() => { window.location.href = url; }, 100);
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
      t.style.borderBottomColor = isActive ? 'var(--brand-primary)' : 'transparent';
      t.style.color = isActive ? 'var(--brand-primary)' : 'var(--text-muted)';
    });
    loadList();
  }

  window.NotifComponent = { load: loadList, refresh: refreshBadge, click: clickNotif, readAll, setFilter };

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.InkuAuth?.getToken?.() && !localStorage.getItem('inkuai_token')) return;
    injectBell();
    refreshBadge();
    setInterval(refreshBadge, POLL_MS);
  });
})();

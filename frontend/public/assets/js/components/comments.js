/**
 * INKU·AI — Sistema de Comentários Reutilizável
 * Uso: InkuComments.mount('project', projectId, '#comments-container')
 */
'use strict';

const InkuComments = (() => {
  async function api(method, path, body) {
    const token = localStorage.getItem('inkuai_token');
    const res = await fetch('/api/v1' + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  }

  function escHtml(t) {
    return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function avatarHtml(user, size = 30) {
    const letter = (user?.name || '?')[0].toUpperCase();
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);
      display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;
      font-size:${size*0.4}px;flex-shrink:0;">${letter}</div>`;
  }

  function renderComment(c, currentUserId, onReply, onDelete) {
    const repliesHtml = (c.replies || []).map(r => renderComment(r, currentUserId, onReply, onDelete)).join('');
    const canDelete = c.author_id === currentUserId;
    return `
    <div class="comment-box" data-comment-id="${c.id}" style="margin-bottom:10px;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        ${avatarHtml(c.author, 32)}
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <a href="/profile.html?id=${c.author_id}" style="font-weight:700;font-size:0.85rem;color:var(--text-primary);text-decoration:none;">${escHtml(c.author?.name||'Anónimo')}</a>
            <span style="font-size:0.72rem;background:rgba(99,102,241,.1);color:#6366f1;padding:1px 7px;border-radius:20px;font-weight:600;">${c.author?.role||''}</span>
            <span style="font-size:0.72rem;color:var(--text-muted);">${timeAgo(c.created_at)}</span>
            ${c.is_pinned ? '<span style="font-size:0.7rem;background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:20px;font-weight:700;">📌 Fixado</span>' : ''}
          </div>
          <div style="font-size:0.875rem;color:var(--text-secondary);margin-top:5px;line-height:1.6;">${escHtml(c.body)}</div>
          <div class="comment-actions">
            <button class="comment-action like-btn" data-id="${c.id}">
              <i class="bi bi-heart${c.likes > 0 ? '-fill' : ''}" style="${c.likes > 0 ? 'color:#dc2626;' : ''}"></i>
              <span class="like-count">${c.likes || 0}</span>
            </button>
            <button class="comment-action reply-btn" data-id="${c.id}" data-author="${escHtml(c.author?.name||'')}">
              <i class="bi bi-reply"></i> Responder
            </button>
            ${canDelete ? `<button class="comment-action delete-btn" data-id="${c.id}" style="color:var(--danger);"><i class="bi bi-trash3"></i></button>` : ''}
          </div>
        </div>
      </div>
      ${repliesHtml ? `<div style="margin-left:42px;margin-top:8px;border-left:2px solid var(--border-light);padding-left:12px;">${repliesHtml}</div>` : ''}
    </div>`;
  }

  function mount(targetType, targetId, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const currentUser = window.InkuAuth?.getUser?.();

    async function load() {
      container.innerHTML = `<div class="text-center py-3" style="color:var(--text-muted);font-size:0.85rem;"><div class="spinner-border spinner-border-sm me-2"></div>A carregar comentários...</div>`;
      try {
        const res = await api('GET', `/social/comments/${targetType}/${targetId}`);
        const comments = res.comments || [];
        if (!comments.length) {
          container.innerHTML = `
            <div style="text-align:center;padding:24px;color:var(--text-muted);">
              <i class="bi bi-chat-dots" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.4;"></i>
              <p style="font-size:0.85rem;">Sem comentários ainda. Sê o primeiro!</p>
            </div>`;
        } else {
          container.innerHTML = comments.map(c => renderComment(c, currentUser?.id, null, null)).join('');
        }
        bindActions();
      } catch(e) {
        container.innerHTML = `<p style="color:var(--danger);font-size:0.85rem;text-align:center;">Erro ao carregar comentários.</p>`;
      }
    }

    function bindActions() {
      container.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const r = await api('POST', `/social/comments/${btn.dataset.id}/like`);
          const countEl = btn.querySelector('.like-count');
          if (countEl && r.likes !== undefined) countEl.textContent = r.likes;
          btn.querySelector('i')?.classList.replace('bi-heart','bi-heart-fill');
          btn.querySelector('i')?.setAttribute('style','color:#dc2626;');
        });
      });
      container.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const author = btn.dataset.author;
          const input = document.querySelector('#comment-input');
          if (input) {
            input.dataset.parentId = btn.dataset.id;
            input.placeholder = `A responder a ${author}...`;
            input.focus();
            document.querySelector('#cancel-reply')?.style && (document.querySelector('#cancel-reply').style.display = '');
          }
        });
      });
      container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remover comentário?')) return;
          await api('DELETE', `/social/comments/${btn.dataset.id}`);
          load();
        });
      });
    }

    // Render comment form
    const form = document.querySelector('#comment-form-' + (containerSelector.replace('#','')));
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('#comment-input');
        const body = input?.value?.trim();
        if (!body) return;
        const parentId = input.dataset.parentId || null;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await api('POST', '/social/comments', { targetType, targetId, body, parentId });
          input.value = '';
          delete input.dataset.parentId;
          input.placeholder = 'Escreve um comentário...';
          load();
        } catch(e) {
          window.showToast?.('Erro ao publicar comentário.', 'error');
        } finally { btn.disabled = false; }
      });
    }

    load();
  }

  return { mount };
})();

window.InkuComments = InkuComments;

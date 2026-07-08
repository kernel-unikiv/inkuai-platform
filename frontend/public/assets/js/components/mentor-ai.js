/**
 * INKU·AI — Mentor IA Flutuante (Cofundador de Cada Projecto)
 * Injeta um FAB + painel de chat em todas as páginas com projecto activo
 */
'use strict';

(function() {
  let projectId = null;
  let history = [];
  let panelOpen = false;

  // Detectar projecto na URL
  const urlParams = new URLSearchParams(window.location.search);
  projectId = urlParams.get('id') || urlParams.get('project');

  // Não injectar em páginas de admin/auth
  const noInject = ['/login','/register','/forgot-password','/admin/'];
  if (noInject.some(p => window.location.pathname.includes(p))) return;

  function injectFAB() {
    const fab = document.createElement('button');
    fab.className = 'ai-fab';
    fab.id = 'mentor-ai-fab';
    fab.title = 'Mentor IA — INKU·AI';
    fab.innerHTML = '🤖';
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);

    const panel = document.createElement('div');
    panel.className = 'ai-fab-panel';
    panel.id = 'mentor-ai-panel';
    panel.style.display = 'none';
    panel.innerHTML = buildPanel();
    document.body.appendChild(panel);

    // Event listeners do painel
    panel.querySelector('#mentor-ai-send')?.addEventListener('click', sendMessage);
    panel.querySelector('#mentor-ai-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    panel.querySelector('#mentor-ai-close')?.addEventListener('click', () => {
      panel.style.display = 'none'; panelOpen = false;
    });
    panel.querySelector('#mentor-ai-analyse')?.addEventListener('click', analyseProject);

    // Quick actions
    panel.querySelectorAll('[data-quick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.quick;
        panel.querySelector('#mentor-ai-input').value = msg;
        sendMessage();
      });
    });
  }

  function buildPanel() {
    return `
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:14px 16px;display:flex;align-items:center;gap:10px;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);border-radius:10px;
                  display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;
                  box-shadow:0 4px 12px rgba(139,92,246,0.5);">🤖</div>
      <div style="flex:1;">
        <div style="color:#fff;font-weight:700;font-size:0.9rem;">Mentor IA</div>
        <div style="color:rgba(255,255,255,0.5);font-size:0.7rem;">Cofundador Virtual · INKU·AI</div>
      </div>
      ${projectId ? `<button id="mentor-ai-analyse" title="Analisar projecto" style="background:rgba(255,255,255,0.1);border:none;color:#a78bfa;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:0.75rem;font-weight:600;">📊 Analisar</button>` : ''}
      <button id="mentor-ai-close" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:1.2rem;padding:0 0 0 8px;">×</button>
    </div>
    <div id="mentor-ai-messages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px;max-height:320px;">
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <div style="width:28px;height:28px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);border-radius:8px;
                    display:flex;align-items:center;justify-content:center;font-size:0.9rem;flex-shrink:0;">🤖</div>
        <div style="background:#f1f5f9;border-radius:0 12px 12px 12px;padding:10px 13px;font-size:0.82rem;color:#374151;line-height:1.5;max-width:85%;">
          Olá! Sou o teu Mentor IA — o teu cofundador virtual.<br>
          ${projectId ? 'Estou a acompanhar este projecto. Como posso ajudar?' : 'Selecciona um projecto para receber mentoria personalizada, ou faz-me qualquer pergunta sobre inovação e empreendedorismo.'}
        </div>
      </div>
    </div>
    ${projectId ? `
    <div style="padding:8px 12px;border-top:1px solid #f1f5f9;display:flex;gap:6px;flex-wrap:wrap;">
      <button data-quick="Quais são os próximos passos para este projecto?" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:600;cursor:pointer;">Próximos passos</button>
      <button data-quick="Analisa os riscos do projecto e como mitigá-los." style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:600;cursor:pointer;">Riscos</button>
      <button data-quick="Sugere fontes de financiamento disponíveis em Angola para este projecto." style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:600;cursor:pointer;">Financiamento</button>
      <button data-quick="Como posso crescer e escalar este projecto em Angola e África?" style="background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:600;cursor:pointer;">Escalar</button>
    </div>` : ''}
    <div style="padding:10px 12px;border-top:1px solid #f1f5f9;display:flex;gap:8px;align-items:flex-end;">
      <textarea id="mentor-ai-input" rows="2" placeholder="Pergunta ao teu Mentor IA..."
        style="flex:1;border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 11px;font-size:0.82rem;
               font-family:inherit;resize:none;outline:none;line-height:1.4;color:#374151;
               transition:border-color 0.15s;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
      <button id="mentor-ai-send" style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);
              border:none;border-radius:10px;color:#fff;cursor:pointer;display:flex;align-items:center;
              justify-content:center;font-size:1rem;flex-shrink:0;transition:transform 0.15s;"
              onmouseenter="this.style.transform='scale(1.08)'" onmouseleave="this.style.transform='scale(1)'">
        <i class="bi bi-send-fill" style="font-size:0.8rem;"></i>
      </button>
    </div>`;
  }

  function togglePanel() {
    const panel = document.getElementById('mentor-ai-panel');
    if (!panel) return;
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? 'flex' : 'none';
    if (panelOpen) panel.querySelector('#mentor-ai-input')?.focus();
  }

  function appendMessage(role, text, isLoading = false) {
    const msgs = document.getElementById('mentor-ai-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';
    div.id = isLoading ? 'ai-typing-indicator' : '';

    if (role === 'user') {
      div.innerHTML = `<div style="margin-left:auto;background:linear-gradient(135deg,#6366f1,#8b5cf6);
        color:#fff;border-radius:12px 0 12px 12px;padding:9px 13px;font-size:0.82rem;line-height:1.5;max-width:85%;">${escHtml(text)}</div>`;
    } else if (isLoading) {
      div.innerHTML = `
        <div style="width:28px;height:28px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;flex-shrink:0;">🤖</div>
        <div style="background:#f1f5f9;border-radius:0 12px 12px 12px;padding:10px 14px;display:flex;gap:4px;align-items:center;">
          <span style="width:6px;height:6px;border-radius:50%;background:#6366f1;animation:aiDot 1.4s infinite;"></span>
          <span style="width:6px;height:6px;border-radius:50%;background:#6366f1;animation:aiDot 1.4s infinite .2s;"></span>
          <span style="width:6px;height:6px;border-radius:50%;background:#6366f1;animation:aiDot 1.4s infinite .4s;"></span>
        </div>`;
    } else {
      div.innerHTML = `
        <div style="width:28px;height:28px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;flex-shrink:0;">🤖</div>
        <div style="background:#f1f5f9;border-radius:0 12px 12px 12px;padding:10px 13px;font-size:0.82rem;color:#374151;line-height:1.6;max-width:85%;white-space:pre-wrap;">${escHtml(text)}</div>`;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendMessage() {
    const input = document.getElementById('mentor-ai-input');
    const msg = input?.value?.trim();
    if (!msg) return;
    input.value = '';
    appendMessage('user', msg);
    const loadingEl = appendMessage('ai', '', true);
    const sendBtn = document.getElementById('mentor-ai-send');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const token = localStorage.getItem('inkuai_token');
      const endpoint = projectId
        ? `/api/v1/mentor-ai/${projectId}/chat`
        : '/api/v1/ai/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: msg, history: history.slice(-8) })
      });
      const data = await res.json();
      loadingEl?.remove();
      const reply = data.message || data.response || 'Ocorreu um erro. Tente novamente.';
      appendMessage('ai', reply);
      history.push({ role: 'user', content: msg }, { role: 'assistant', content: reply });
      if (history.length > 20) history = history.slice(-20);
      if (data.actions_taken > 0) {
        const actionNote = document.createElement('div');
        actionNote.style.cssText = 'text-align:center;font-size:0.7rem;color:#8b5cf6;padding:4px;';
        actionNote.textContent = `✨ ${data.actions_taken} acção(ões) executada(s) automaticamente`;
        document.getElementById('mentor-ai-messages')?.appendChild(actionNote);
      }
    } catch(e) {
      loadingEl?.remove();
      appendMessage('ai', 'Erro de ligação. Verifique a sua conexão e tente novamente.');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  async function analyseProject() {
    if (!projectId) return;
    const btn = document.getElementById('mentor-ai-analyse');
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
    appendMessage('user', '📊 Análise automática do projecto');
    const loadingEl = appendMessage('ai', '', true);
    try {
      const token = localStorage.getItem('inkuai_token');
      const res = await fetch(`/api/v1/mentor-ai/${projectId}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      loadingEl?.remove();
      appendMessage('ai', data.analysis || 'Análise concluída. Verifique as suas notificações.');
    } catch(e) {
      loadingEl?.remove();
      appendMessage('ai', 'Erro ao analisar. Tente novamente.');
    } finally {
      if (btn) { btn.textContent = '📊 Analisar'; btn.disabled = false; }
    }
  }

  function escHtml(t) {
    return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  // Injectar animação CSS se não existir
  if (!document.getElementById('mentor-ai-styles')) {
    const style = document.createElement('style');
    style.id = 'mentor-ai-styles';
    style.textContent = `@keyframes aiDot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}`;
    document.head.appendChild(style);
  }

  // Injectar após DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFAB);
  } else {
    injectFAB();
  }
})();

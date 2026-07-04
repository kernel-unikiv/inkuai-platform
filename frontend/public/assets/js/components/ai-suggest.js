'use strict';
// ── Sugestões IA — estilo "rascunho de email" ────────────────────────────
// Gmail Smart Compose inspirado: discreto, inline, sem cores agressivas

(function() {
  let openPanelField = null;

  function injectStylesOnce() {
    if (document.getElementById('ai-suggest-styles')) return;
    const s = document.createElement('style');
    s.id = 'ai-suggest-styles';
    s.textContent = `
      /* Botão ✨ discreto ao canto do campo */
      .ai-suggest-btn {
        position: absolute; width: 26px; height: 26px; border-radius: 7px;
        border: 1px solid var(--border-subtle,#e2e8f0);
        background: var(--white,#fff); color: var(--text-tertiary,#8b949e);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: .72rem; z-index: 5;
        transition: background .15s, color .15s, border-color .15s;
      }
      .ai-suggest-btn:hover {
        background: var(--brand-50,#f3f7ff);
        color: var(--brand-600,#2354a8);
        border-color: var(--brand-200,#c2d9fd);
      }
      .ai-suggest-btn.loading i {
        animation: ai-spin 1s linear infinite;
      }
      @keyframes ai-spin { to { transform: rotate(360deg); } }

      /* Painel "rascunho" — calmo, inline, tom de carta */
      .ai-draft-panel {
        margin-top: 6px;
        background: var(--gray-50,#f7f9fc);
        border: 1px solid var(--border-subtle,#e2e8f0);
        border-left: 3px solid var(--brand-300,#93b8fb);
        border-radius: var(--radius-sm,8px);
        padding: 10px 12px;
        animation: ai-slide-in .18s ease-out;
      }
      @keyframes ai-slide-in {
        from { opacity:0; transform: translateY(-4px); }
        to   { opacity:1; transform: translateY(0); }
      }

      .ai-draft-header {
        display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
        font-size: .6875rem; font-weight: 600; color: var(--text-tertiary,#8b949e);
        text-transform: uppercase; letter-spacing: .04em;
      }
      .ai-draft-close-btn {
        margin-left: auto; border: none; background: none;
        color: var(--text-tertiary,#8b949e); cursor: pointer;
        font-size: .8rem; line-height: 1; padding: 2px;
        border-radius: 4px; transition: background .12s;
      }
      .ai-draft-close-btn:hover { background: var(--gray-100,#eef1f5); color: var(--text-primary,#0d1117); }

      /* Estado de carregamento */
      .ai-draft-loading {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 2px; color: var(--text-secondary,#6e7681); font-size: .8125rem;
      }

      /* Texto da sugestão — calmo, legível */
      .ai-draft-text {
        font-size: .8125rem; line-height: 1.65; color: var(--text-primary,#0d1117);
        white-space: pre-wrap; max-height: 220px; overflow-y: auto;
        font-family: var(--font-sans, inherit); padding: 2px;
      }

      /* Lista de sugestões */
      .ai-draft-option {
        padding: 8px 10px; border-radius: 6px; cursor: pointer;
        font-size: .8125rem; color: var(--text-primary,#0d1117);
        margin-bottom: 4px; border: 1px solid transparent;
        transition: background .12s, border-color .12s;
      }
      .ai-draft-option:hover {
        background: var(--white,#fff);
        border-color: var(--border-subtle,#e2e8f0);
      }

      /* Acções */
      .ai-draft-actions { display: flex; gap: 8px; margin-top: 10px; }

      .ai-btn-use {
        font-size: .8rem; font-weight: 600; color: #fff;
        background: var(--brand-600,#2354a8);
        border: none; border-radius: 7px; padding: 6px 14px;
        cursor: pointer; transition: background .15s;
      }
      .ai-btn-use:hover { background: var(--brand-700,#1a3f78); }

      .ai-btn-retry {
        font-size: .8rem; font-weight: 500;
        color: var(--text-secondary,#6e7681); background: transparent;
        border: 1px solid var(--border-default,#c9d1d9);
        border-radius: 7px; padding: 6px 14px; cursor: pointer;
        transition: background .12s;
      }
      .ai-btn-retry:hover { background: var(--gray-100,#eef1f5); }

      /* Flash verde ao aplicar */
      .ai-applied-flash { transition: background-color .6s ease; background-color: var(--success-50,#f0fdf4) !important; }
    `;
    document.head.appendChild(s);
  }

  /* ── Injectar botões em todos os campos [data-ai-field] ── */
  function injectButtons() {
    document.querySelectorAll('[data-ai-field]:not([data-ai-injected])').forEach(field => {
      field.setAttribute('data-ai-injected', 'true');
      const fieldType = field.getAttribute('data-ai-field');
      const parent = field.parentElement;
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-suggest-btn';
      btn.title = 'Sugestão IA';
      btn.innerHTML = '<i class="bi bi-magic"></i>';
      btn.style.right = '8px';
      btn.style.top = (field.tagName === 'TEXTAREA') ? '8px' : '50%';
      btn.style.transform = (field.tagName === 'TEXTAREA') ? 'none' : 'translateY(-50%)';
      btn.onclick = (e) => { e.preventDefault(); togglePanel(field, fieldType, btn); };
      if (field.tagName !== 'SELECT') field.style.paddingRight = '40px';
      parent.appendChild(btn);
    });
  }

  /* ── Toggle painel de sugestão ── */
  async function togglePanel(field, fieldType, btn) {
    injectStylesOnce();

    // Fechar se já está aberto para este campo
    const existing = findPanel(field);
    if (existing && openPanelField === field) {
      existing.remove();
      openPanelField = null;
      return;
    }
    closeAllPanels();
    openPanelField = field;

    // Criar painel inline após o elemento pai do campo
    const panel = document.createElement('div');
    panel.className = 'ai-draft-panel';
    panel.dataset.forField = fieldType;
    panel.innerHTML = `
      <div class="ai-draft-header">
        <i class="bi bi-magic"></i> Sugestão IA
        <button type="button" class="ai-draft-close-btn" aria-label="Fechar">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="ai-draft-body">
        <div class="ai-draft-loading">
          <div class="spinner-border spinner-border-sm"></div>
          <span>A redigir sugestão…</span>
        </div>
      </div>`;
    field.parentElement.insertAdjacentElement('afterend', panel);
    panel.querySelector('.ai-draft-close-btn').onclick = () => { panel.remove(); openPanelField = null; };

    // Loading state no botão
    btn.classList.add('loading');
    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i>';

    try {
      const projectType = document.querySelector('[name=type], #proj-type, select[id*="type"]')?.value || 'software';
      const res = await window.InkuAPI.post('/ai-suggest/field', {
        field: fieldType,
        currentValue: field.value,
        projectType
      });
      renderResult(panel, field, fieldType, res, btn);
    } catch (err) {
      panel.querySelector('.ai-draft-body').innerHTML =
        `<div style="color:var(--danger-500,#dc2626);font-size:.8125rem;padding:4px 2px">
          ❌ ${esc(err.message)}
        </div>`;
    } finally {
      btn.classList.remove('loading');
      btn.innerHTML = '<i class="bi bi-magic"></i>';
    }
  }

  /* ── Renderizar resultado ── */
  function renderResult(panel, field, fieldType, res, triggerBtn) {
    const body = panel.querySelector('.ai-draft-body');

    if (res.suggestions?.length) {
      // Lista de opções curtas (títulos, tags, tech_stack)
      body.innerHTML = res.suggestions.map((s, i) =>
        `<div class="ai-draft-option" data-idx="${i}">${esc(s)}</div>`
      ).join('');
      body.querySelectorAll('.ai-draft-option').forEach((el, i) => {
        el.onclick = () => { applyToField(field, res.suggestions[i]); panel.remove(); openPanelField = null; };
      });
      return;
    }

    if (res.text) {
      // Texto longo — mostrar com botões de acção
      body.innerHTML = `
        <div class="ai-draft-text">${esc(res.text)}</div>
        <div class="ai-draft-actions">
          <button type="button" class="ai-btn-use">
            <i class="bi bi-check2 me-1"></i>Usar este texto
          </button>
          <button type="button" class="ai-btn-retry">
            <i class="bi bi-arrow-repeat me-1"></i>Tentar outra vez
          </button>
        </div>`;
      body.querySelector('.ai-btn-use').onclick   = () => { applyToField(field, res.text); panel.remove(); openPanelField = null; };
      body.querySelector('.ai-btn-retry').onclick = () => { panel.remove(); openPanelField = null; togglePanel(field, fieldType, triggerBtn); };
    }
  }

  /* ── Aplicar valor ao campo ── */
  function applyToField(field, value) {
    if (field.tagName === 'SELECT') return;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.classList.add('ai-applied-flash');
    setTimeout(() => field.classList.remove('ai-applied-flash'), 900);
  }

  /* ── Utilitários ── */
  function findPanel(field) {
    return field.parentElement.nextElementSibling?.classList.contains('ai-draft-panel')
      ? field.parentElement.nextElementSibling
      : null;
  }
  function closeAllPanels() {
    document.querySelectorAll('.ai-draft-panel').forEach(p => p.remove());
    openPanelField = null;
  }
  function esc(t) { return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* Fechar ao clicar fora */
  document.addEventListener('click', (e) => {
    if (!openPanelField) return;
    const panel = document.querySelector('.ai-draft-panel');
    if (panel && !panel.contains(e.target) && !e.target.closest('.ai-suggest-btn')) closeAllPanels();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllPanels(); });

  document.addEventListener('DOMContentLoaded', injectButtons);
  // Re-scan periódico para campos injectados via modais Bootstrap
  setInterval(injectButtons, 800);

  window.AISuggest = { injectButtons, closeAll: closeAllPanels };
})();

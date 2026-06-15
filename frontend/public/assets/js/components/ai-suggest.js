/**
 * INKU·AI — Componente de Sugestões IA para Formulários
 * Uso: InkuAISuggest.attach(formType)
 */
'use strict';

const InkuAISuggest = (() => {
  
  // Adiciona botão "✨ Sugerir" a um campo
  function attachField(input, formType, contextFn) {
    if (!input || input.dataset.aiAttached) return;
    input.dataset.aiAttached = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'ai-suggest-wrapper position-relative';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm ai-suggest-btn';
    btn.innerHTML = `<span class="ai-btn-icon">✨</span> Sugerir com IA`;
    btn.style.cssText = `
      position:absolute; right:8px; top:6px; z-index:10;
      background: linear-gradient(135deg,#6366f1,#8b5cf6);
      color:#fff; border:none; border-radius:20px; padding:3px 10px;
      font-size:11px; font-weight:600; cursor:pointer; transition:all .2s;
      box-shadow:0 2px 8px rgba(99,102,241,.3);
    `;
    btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';

    // Only add absolute btn for textarea/text fields
    if (input.tagName === 'TEXTAREA') {
      input.style.paddingRight = '130px';
      wrapper.style.position = 'relative';
      btn.style.top = '8px';
      wrapper.appendChild(btn);
    } else {
      input.style.paddingRight = '130px';
      wrapper.appendChild(btn);
    }

    btn.addEventListener('click', async () => {
      const fieldName = input.dataset.aiField || input.name || input.placeholder || input.id;
      const partialText = input.value;
      const context = contextFn ? contextFn() : '';

      btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> A gerar...`;
      btn.disabled = true;

      try {
        const token = localStorage.getItem('inkuai_token');
        const res = await fetch('/api/v1/ai/form-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ form_type: formType, field: fieldName, context, partial_text: partialText })
        });
        const data = await res.json();
        if (data.success && data.suggestion) {
          showSuggestionModal(input, data.suggestion, btn);
        } else {
          showToast('Não foi possível gerar sugestão. Tente novamente.', 'warning');
        }
      } catch(e) {
        showToast('Erro ao contactar IA: ' + (e.message || 'desconhecido'), 'danger');
      } finally {
        btn.innerHTML = `<span class="ai-btn-icon">✨</span> Sugerir com IA`;
        btn.disabled = false;
      }
    });
  }

  // Modal de confirmação da sugestão
  function showSuggestionModal(input, suggestion, btn) {
    const existing = document.getElementById('aiSuggestModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'aiSuggestModal';
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:9999;
      display:flex; align-items:center; justify-content:center; padding:16px;
    `;
    modal.innerHTML = `
      <div style="background:#1e1e2e; border:1px solid #6366f1; border-radius:16px;
                  max-width:600px; width:100%; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                      border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">✨</div>
          <h5 style="color:#fff;margin:0;font-weight:700;">Sugestão da IA</h5>
        </div>
        <div style="background:#12121f; border-radius:10px; padding:16px; margin-bottom:16px;
                    color:#c4c4e0; font-size:14px; line-height:1.7; max-height:300px; overflow-y:auto;
                    border:1px solid #2d2d4e; white-space:pre-wrap;">${escapeHtml(suggestion)}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
          <button id="aiSuggestReject" class="btn btn-sm btn-outline-secondary" style="border-color:#444;color:#aaa;">
            ✗ Cancelar
          </button>
          <button id="aiSuggestAppend" class="btn btn-sm" style="background:#374151;color:#d1d5db;border:none;">
            + Adicionar ao texto
          </button>
          <button id="aiSuggestAccept" class="btn btn-sm" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;font-weight:600;">
            ✓ Usar esta sugestão
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('aiSuggestAccept').onclick = () => {
      input.value = suggestion;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      modal.remove();
      showToast('Sugestão aplicada!', 'success');
    };
    document.getElementById('aiSuggestAppend').onclick = () => {
      input.value = (input.value ? input.value + '\n\n' : '') + suggestion;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      modal.remove();
      showToast('Texto adicionado!', 'success');
    };
    document.getElementById('aiSuggestReject').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  function escapeHtml(t) {
    return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function showToast(msg, type='info') {
    if (window.InkuToast) { window.InkuToast.show(msg, type); return; }
    alert(msg);
  }

  // Attach to all fields with data-ai-suggest attribute
  function attachAll(formType, contextFn) {
    document.querySelectorAll('[data-ai-suggest]').forEach(el => {
      attachField(el, formType || el.dataset.aiSuggest || 'project', contextFn);
    });
  }

  // Full auto-write: fill the whole form via AI
  async function autoFill(formType, context) {
    const fields = document.querySelectorAll('[data-ai-suggest]');
    if (!fields.length) return;

    const token = localStorage.getItem('inkuai_token');
    showToast('A preencher formulário com IA...', 'info');

    for (const field of fields) {
      const fieldName = field.dataset.aiField || field.name || field.placeholder || field.id;
      try {
        const res = await fetch('/api/v1/ai/form-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ form_type: formType, field: fieldName, context, partial_text: '' })
        });
        const data = await res.json();
        if (data.success && data.suggestion) {
          field.value = data.suggestion;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(r => setTimeout(r, 300)); // small delay between calls
        }
      } catch(e) { /* skip field */ }
    }
    showToast('Formulário preenchido pela IA! Reveja antes de submeter.', 'success');
  }

  return { attachAll, attachField, autoFill };
})();

window.InkuAISuggest = InkuAISuggest;

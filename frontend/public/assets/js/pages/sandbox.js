'use strict';

let currentProjectId = null;

async function initSandbox() {
  if (!window.InkuAuth?.getToken()) { window.location.href = '/pages/login.html'; return; }
  
  // Carregar projectos do utilizador para selecção
  try {
    const res = await window.InkuAPI.get('/projects/my');
    const projects = res.projects || [];
    const select = document.getElementById('project-select');
    if (select) {
      select.innerHTML = '<option value="">-- Seleccionar Projecto --</option>' +
        projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
      select.addEventListener('change', e => { currentProjectId = e.target.value; });
    }
  } catch {}

  // Run button
  const runBtn = document.getElementById('run-btn');
  const terminal = document.getElementById('terminal-output');
  const codeEditor = document.getElementById('code-editor');

  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      const code = codeEditor?.value?.trim();
      if (!code) { window.showToast?.('Insira código para executar.', 'warning'); return; }
      if (!currentProjectId) { window.showToast?.('Seleccione um projecto primeiro.', 'warning'); return; }

      runBtn.disabled = true;
      runBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>A executar...';
      appendTerminal('info', '$ Enviando código para sandbox INKU·AI...');

      try {
        const execType = document.getElementById('exec-type')?.value || 'python';
        const result = await window.InkuAPI.post('/sandbox/execute', {
          code, project_id: currentProjectId, type: execType
        });

        appendTerminal('ok', `✓ Execução concluída em ${result.executionTime}ms | Status: ${result.status}`);
        if (result.stdout) result.stdout.split('\n').forEach(l => appendTerminal('out', l));
        if (result.stderr) result.stderr.split('\n').forEach(l => appendTerminal('err', l));
      } catch (err) {
        appendTerminal('err', `✗ Erro: ${err.message}`);
        window.showToast?.(err.message, 'error');
      } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="bi bi-play-fill me-2"></i>Executar';
      }
    });
  }

  // Clear terminal
  document.getElementById('clear-btn')?.addEventListener('click', () => {
    if (terminal) terminal.innerHTML = '<span class="t-info">INKU·AI Sandbox — Pronto para execução</span>\n';
  });
}

function appendTerminal(type, text) {
  const terminal = document.getElementById('terminal-output');
  if (!terminal) return;
  const span = document.createElement('span');
  span.className = { out: 't-out', err: 't-err', ok: 't-ok', info: 't-info' }[type] || 't-out';
  span.textContent = text;
  terminal.appendChild(span);
  terminal.appendChild(document.createTextNode('\n'));
  terminal.scrollTop = terminal.scrollHeight;
}

document.addEventListener('DOMContentLoaded', initSandbox);

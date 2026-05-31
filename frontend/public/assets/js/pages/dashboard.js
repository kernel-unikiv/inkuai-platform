'use strict';

async function loadDashboard() {
  if (!window.InkuAuth?.getToken()) { window.location.href = '/login.html'; return; }

  try {
    const [statsRes, projectsRes, startupsRes] = await Promise.all([
      window.InkuAPI.get('/users/dashboard/stats'),
      window.InkuAPI.get('/projects/my'),
      window.InkuAPI.get('/startups/my')
    ]);

    // Métricas
    const stats = statsRes.stats;
    setEl('stat-startups', stats.startups || 0);
    setEl('stat-projects', stats.projects || 0);
    setEl('stat-notifs', stats.notifications || 0);

    // Projectos recentes
    const projects = projectsRes.projects || [];
    const projList = document.getElementById('recent-projects');
    if (projList) {
      if (projects.length === 0) {
        projList.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum projecto ainda. <a href="/projects.html">Criar projecto</a></td></tr>';
      } else {
        projList.innerHTML = projects.slice(0,5).map(p => `
          <tr>
            <td><a href="/project-detail.html?id=${p.id}" class="text-decoration-none text-white">${p.title}</a></td>
            <td><span class="badge bg-secondary">${p.type}</span></td>
            <td><span class="status status-${p.status}">${p.status}</span></td>
            <td>${new Date(p.created_at).toLocaleDateString('pt-PT')}</td>
            <td><a href="/project-detail.html?id=${p.id}" class="btn btn-sm btn-outline-secondary">Ver</a></td>
          </tr>
        `).join('');
      }
    }

    // Startups
    const startups = startupsRes.startups || [];
    const stList = document.getElementById('my-startups');
    if (stList) {
      stList.innerHTML = startups.length === 0
        ? '<p class="text-muted small">Nenhuma startup criada. <a href="/startups.html">Criar startup</a></p>'
        : startups.slice(0,4).map(s => `
          <a href="/startup-detail.html?id=${s.id}" class="d-block p-3 rounded-3 mb-2 text-decoration-none"
             style="background:rgba(255,255,255,0.03);border:1px solid var(--inkuai-border)">
            <div class="d-flex align-items-center gap-2">
              <div style="width:32px;height:32px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:#fff">${s.name[0]}</div>
              <div>
                <div class="text-white small fw-bold">${s.name}</div>
                <div class="text-muted" style="font-size:0.72rem"><span class="status status-${s.status}">${s.status}</span></div>
              </div>
            </div>
          </a>
        `).join('');
    }

  } catch (err) {
    window.showToast?.(err.message, 'error');
  }
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

document.addEventListener('DOMContentLoaded', loadDashboard);

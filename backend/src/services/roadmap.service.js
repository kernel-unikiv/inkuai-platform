'use strict';
const { ProjectRoadmap, Project, User, Notification } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const Anthropic = require('@anthropic-ai/sdk');

const PHASES_ORDER = ['ideacao','validacao','prototipo','mvp','lancamento','crescimento'];
const PHASES_LABELS = {
  ideacao:'💡 Ideação', validacao:'🔍 Validação', prototipo:'🛠️ Protótipo',
  mvp:'🚀 MVP', lancamento:'📣 Lançamento', crescimento:'📈 Crescimento'
};

class RoadmapService {
  async getProjectRoadmap(projectId) {
    const phases = await ProjectRoadmap.findAll({
      where: { project_id: projectId },
      order: [['order_index','ASC'],['created_at','ASC']]
    });
    return phases;
  }

  async createPhase(projectId, data, userId) {
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (project.created_by !== userId) throw new AppError('Sem permissão.', 403);

    const count = await ProjectRoadmap.count({ where: { project_id: projectId } });
    return ProjectRoadmap.create({
      project_id: projectId,
      phase: data.phase || 'ideacao',
      title: data.title,
      description: data.description,
      tasks_json: JSON.stringify(data.tasks || []),
      resources_json: JSON.stringify(data.resources || []),
      due_date: data.due_date || null,
      order_index: count
    });
  }

  async updatePhase(phaseId, data, userId) {
    const phase = await ProjectRoadmap.findByPk(phaseId, {
      include: [{ model: Project, as: 'project' }]
    });
    if (!phase) throw new AppError('Fase não encontrada.', 404);
    if (phase.project.created_by !== userId) throw new AppError('Sem permissão.', 403);

    if (data.tasks) data.tasks_json = JSON.stringify(data.tasks);
    if (data.resources) data.resources_json = JSON.stringify(data.resources);
    if (data.status === 'completed' && !phase.completed_at) {
      data.completed_at = new Date();
      data.progress = 100;
      // Notify creator
      await Notification.create({
        user_id: userId, type: 'success',
        title: `✅ Fase concluída: ${phase.title}`,
        message: `A fase "${phase.title}" do projecto "${phase.project.title}" foi marcada como completa!`,
        action_url: `/project-detail.html?id=${phase.project_id}`
      });
    }
    return phase.update(data);
  }

  async deletePhase(phaseId, userId) {
    const phase = await ProjectRoadmap.findByPk(phaseId, {
      include: [{ model: Project, as: 'project' }]
    });
    if (!phase) throw new AppError('Fase não encontrada.', 404);
    if (phase.project.created_by !== userId) throw new AppError('Sem permissão.', 403);
    await phase.destroy();
    return { deleted: true };
  }

  // IA gera roadmap completo para o projecto
  async generateAIRoadmap(projectId, userId) {
    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'creator', attributes: ['name'] }]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `És um mentor especialista em incubação de startups e inovação em Angola.
Gera um roadmap completo de 6 fases para este projecto:

Projecto: ${project.title}
Tipo: ${project.type}
Descrição: ${(project.description||'').substring(0,400)}
Stack: ${project.tech_stack_json}

Retorna APENAS um JSON array com exactamente 6 objectos, um por fase, nesta ordem:
ideacao, validacao, prototipo, mvp, lancamento, crescimento

Cada objecto deve ter:
{
  "phase": "ideacao",
  "title": "Título específico da fase",
  "description": "Descrição detalhada (2-3 frases) contextualizada para Angola",
  "tasks": ["Tarefa 1", "Tarefa 2", "Tarefa 3", "Tarefa 4"],
  "resources": ["Recurso/ferramenta 1", "Recurso 2"],
  "duration_weeks": 4
}

Sem explicações. Apenas o JSON array.`;

    const resp = await ai.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    let phases;
    try {
      const text = resp.content[0].text.trim();
      const json = text.replace(/```json|```/g,'').trim();
      phases = JSON.parse(json);
    } catch(e) {
      throw new AppError('IA não devolveu JSON válido. Tente novamente.', 500);
    }

    // Remove roadmap existente
    await ProjectRoadmap.destroy({ where: { project_id: projectId } });

    // Cria todas as fases
    const created = [];
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      created.push(await ProjectRoadmap.create({
        project_id: projectId,
        phase: p.phase || PHASES_ORDER[i],
        title: p.title,
        description: p.description,
        tasks_json: JSON.stringify(p.tasks || []),
        resources_json: JSON.stringify(p.resources || []),
        status: i === 0 ? 'active' : 'pending',
        order_index: i,
        ai_notes: `Duração estimada: ${p.duration_weeks || 4} semanas`
      }));
    }

    return created;
  }
}

module.exports = new RoadmapService();

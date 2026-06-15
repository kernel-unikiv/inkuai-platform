'use strict';
const { ProjectSubmission, Project, User, Notification, Evaluation } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const Anthropic = require('@anthropic-ai/sdk');

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class SubmissionService {
  async create(data, userId) {
    const project = await Project.findByPk(data.project_id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    const sub = await ProjectSubmission.create({ ...data, submitted_by: userId });

    // Notify mentor/admin
    await Notification.create({
      user_id: project.created_by !== userId ? project.created_by : userId,
      type: 'info',
      title: `📤 Nova entrega: ${sub.title}`,
      message: `Nova entrega submetida no projecto "${project.title}".`,
      action_url: `/pages/classroom.html?project=${data.project_id}`
    });

    return this._enrich(sub);
  }

  async getProjectSubmissions(projectId, userId, role) {
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    const where = { project_id: projectId };
    // Members only see own submissions unless they're mentor/admin
    if (!['admin','mentor'].includes(role) && project.created_by !== userId) {
      where.submitted_by = userId;
    }

    const subs = await ProjectSubmission.findAll({
      where,
      include: [
        { model: User, as: 'submitter', attributes: ['id','name','avatar_url'] },
        { model: User, as: 'reviewer', attributes: ['id','name'], required: false }
      ],
      order: [['created_at','DESC']]
    });
    return subs.map(s => this._enrich(s));
  }

  async getById(id) {
    const s = await ProjectSubmission.findByPk(id, {
      include: [
        { model: User, as: 'submitter', attributes: ['id','name','avatar_url','role'] },
        { model: User, as: 'reviewer', attributes: ['id','name'], required: false },
        { model: Project, as: 'project', attributes: ['id','title','type'] }
      ]
    });
    if (!s) throw new AppError('Entrega não encontrada.', 404);
    return this._enrich(s);
  }

  async grade(id, { score, feedback }, reviewerId) {
    const s = await ProjectSubmission.findByPk(id, {
      include: [{ model: Project, as: 'project' }]
    });
    if (!s) throw new AppError('Entrega não encontrada.', 404);

    await s.update({
      score, feedback,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      status: 'graded'
    });

    // Notify submitter
    await Notification.create({
      user_id: s.submitted_by, type: 'success',
      title: `✅ Entrega avaliada: ${score}/${s.max_score}`,
      message: `A sua entrega "${s.title}" foi avaliada com ${score} pontos.`,
      action_url: `/pages/classroom.html?project=${s.project_id}`
    });

    return this._enrich(s);
  }

  async generateAIFeedback(id) {
    const s = await ProjectSubmission.findByPk(id, {
      include: [{ model: Project, as: 'project' }]
    });
    if (!s) throw new AppError('Entrega não encontrada.', 404);

    const prompt = `Analisa esta entrega de projecto académico/startup e fornece feedback construtivo detalhado.

Projecto: ${s.project?.title || 'N/A'}
Tipo de entrega: ${s.type}
Título: ${s.title}
Descrição/Conteúdo: ${s.description || 'Não fornecido'}
Código (se houver): ${s.code_snippet ? s.code_snippet.substring(0, 1000) : 'Não fornecido'}

Fornece:
1. Pontos fortes (2-3)
2. Áreas de melhoria (2-3)
3. Sugestões específicas
4. Nota estimada (0-100)

Responde em português de Angola, de forma profissional mas acessível.`;

    const resp = await ai.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const aiFeedback = resp.content[0].text;
    // Extract score from feedback (look for pattern like "Nota: 75")
    const scoreMatch = aiFeedback.match(/[Nn]ota[:\s]+(\d+)/);
    const aiScore = scoreMatch ? parseFloat(scoreMatch[1]) : null;

    await s.update({ ai_feedback: aiFeedback, ai_score: aiScore });
    return { ai_feedback: aiFeedback, ai_score: aiScore };
  }

  _enrich(s) {
    const j = s.toJSON();
    try { j.files = JSON.parse(s.files_json||'[]'); } catch { j.files = []; }
    try { j.links = JSON.parse(s.links_json||'[]'); } catch { j.links = []; }
    return j;
  }
}

module.exports = new SubmissionService();

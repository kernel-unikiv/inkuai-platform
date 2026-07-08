'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { Project, User, ProjectRoadmap, ProjectSubmission, MentorAssignment,
        Notification, Message, Evaluation } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MENTOR_SYSTEM = `És o INKU·AI Mentor, o cofundador virtual de cada projecto na plataforma IP/UNIKIVI, Angola. FUNDECIT Edital Nº 1/2026.

PAPEL: Mentor IA que acompanha projectos como um cofundador experiente. Combinação de:
- Steve Jobs (visão e produto)
- Paul Graham (startup e crescimento)
- Um professor universitário angolano (contexto local)
- Um investidor de impacto em África

PODERES QUE PODES EXECUTAR AUTONOMAMENTE (usa o formato ACTION):
[ACTION:{"type":"notify_user","payload":{"user_id":"UUID","title":"...","message":"...","notif_type":"info"}}]
[ACTION:{"type":"notify_by_role","payload":{"role":["student"],"title":"...","message":"..."}}]
[ACTION:{"type":"send_message","payload":{"receiver_id":"UUID","subject":"...","body":"..."}}]
[ACTION:{"type":"create_roadmap_task","payload":{"project_id":"UUID","task":"..."}}]
[ACTION:{"type":"suggest_resource","payload":{"project_id":"UUID","resource":"...","url":"..."}}]

CONTEXTO DO PROJECTO: {PROJECT_CONTEXT}

CAPACIDADES:
- Analisa o progresso e sugere próximos passos concretos
- Identifica riscos e oportunidades específicas para Angola/África
- Sugere financiamento (FUNDECIT, BAD, AFC, BDA Angola, etc.)
- Recomenda parceiros, tecnologias, estratégias de crescimento
- Avalia submissões e dá feedback técnico detalhado
- Cria tarefas no roadmap automaticamente
- Notifica a equipa quando necessário

Responde sempre em Português de Angola. Sê directo, prático e usa dados reais.
Quando sugeres algo accionável, usa o formato ACTION para o executar.`;

class MentorAIService {

  async chat(projectId, userMessage, userId, history = []) {
    const project = await Project.findByPk(projectId, {
      include: [
        { model: User, as: 'creator', attributes: ['name','email','institution'] },
        { model: ProjectRoadmap, as: 'roadmap', order: [['order_index','ASC']] },
        { model: ProjectSubmission, as: 'submissions', limit: 3, order: [['created_at','DESC']] }
      ]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    // Contexto rico do projecto
    const roadmapSummary = (project.roadmap || []).map(r =>
      `${r.phase}: ${r.title} [${r.status}] ${r.progress}%`
    ).join(', ');
    const submissionsSummary = (project.submissions || []).map(s =>
      `${s.type}: ${s.title} [${s.status}]${s.score ? ` nota:${s.score}` : ''}`
    ).join(', ');

    const projectContext = `
Projecto: ${project.title} | Tipo: ${project.type} | Status: ${project.status}
Fase actual: ${project.current_phase || 'ideacao'}
Criador: ${project.creator?.name} | Instituição: ${project.creator?.institution}
Descrição: ${(project.description||'').substring(0,300)}
Stack: ${project.tech_stack_json}
Roadmap: ${roadmapSummary || 'Sem roadmap definido'}
Últimas entregas: ${submissionsSummary || 'Sem entregas'}
`.trim();

    const systemPrompt = MENTOR_SYSTEM.replace('{PROJECT_CONTEXT}', projectContext);

    // Construir histórico da conversa
    const messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    const resp = await ai.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1200,
      system: systemPrompt, messages
    });

    const fullText = resp.content[0].text;

    // Extrair e executar ACTIONs
    const actions = [];
    const actionRegex = /\[ACTION:(\{[^}]+(?:\{[^}]*\}[^}]*)*\})\]/g;
    let match;
    while ((match = actionRegex.exec(fullText)) !== null) {
      try {
        const action = JSON.parse(match[1]);
        actions.push(action);
        await this._execAction(action, project, userId);
      } catch(e) { console.warn('[MentorAI action error]', e.message); }
    }

    // Texto limpo (sem ACTIONs)
    const cleanText = fullText.replace(/\[ACTION:\{[^}]+(?:\{[^}]*\}[^}]*)*\}\]/g, '').trim();

    return { message: cleanText, actions_taken: actions.length, raw: fullText };
  }

  async _execAction(action, project, userId) {
    const { type, payload } = action;
    if (type === 'notify_user' && payload?.user_id) {
      await Notification.create({
        user_id: payload.user_id, type: payload.notif_type || 'info',
        title: payload.title || '🤖 Mentor IA',
        message: payload.message || '',
        action_url: `/project-detail.html?id=${project.id}`
      });
    }
    if (type === 'notify_by_role' && payload?.role) {
      const roles = Array.isArray(payload.role) ? payload.role : [payload.role];
      const { Op } = require('sequelize');
      const users = await User.findAll({ where: { role: { [Op.in]: roles }, is_active: true } });
      await Promise.all(users.map(u => Notification.create({
        user_id: u.id, type: payload.notif_type || 'info',
        title: payload.title || '🤖 Mentor IA',
        message: payload.message || '',
        action_url: `/project-detail.html?id=${project.id}`
      })));
    }
    if (type === 'send_message' && payload?.receiver_id) {
      const adminUser = await User.findOne({ where: { role: 'admin' } });
      if (adminUser) {
        await Message.create({
          sender_id: adminUser.id, receiver_id: payload.receiver_id,
          subject: payload.subject || '🤖 Mentor IA — INKU·AI',
          body: payload.body || ''
        });
      }
    }
  }

  // Análise automática do projecto (chamada periódica)
  async analyseProject(projectId) {
    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'creator', attributes: ['name','id'] }]
    });
    if (!project) return null;

    const prompt = `Analisa brevemente o projecto "${project.title}" (${project.type}).
Descrição: ${(project.description||'N/A').substring(0,200)}
Dá 3 sugestões concretas de melhoria e 1 risco principal. Máximo 150 palavras. Português de Angola.`;

    const resp = await ai.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    });

    const analysis = resp.content[0].text;

    // Notificar criador com análise
    await Notification.create({
      user_id: project.created_by, type: 'info',
      title: `🤖 Mentor IA analisou "${project.title}"`,
      message: analysis.substring(0, 200) + '...',
      action_url: `/project-detail.html?id=${projectId}`
    });

    return { analysis, project_id: projectId };
  }

  // Avaliação automática de uma submission
  async evaluateSubmission(submissionId) {
    const { ProjectSubmission } = require('../models/sql/index');
    const sub = await ProjectSubmission.findByPk(submissionId, {
      include: [{ model: Project, as: 'project' }]
    });
    if (!sub) return null;

    const prompt = `Avalia esta entrega de projecto académico/startup.
Projecto: ${sub.project?.title}
Tipo de entrega: ${sub.type}
Título: ${sub.title}
Descrição: ${(sub.description||'').substring(0,400)}
${sub.code_snippet ? `Código: ${sub.code_snippet.substring(0,300)}` : ''}

Fornece:
1. ✅ Pontos fortes (2)
2. 🔧 Melhorias necessárias (2)
3. 💡 Sugestão estratégica (1)
4. 📊 Nota estimada (0-100)

Formato: Português de Angola, máximo 200 palavras. Termina com "Nota: X/100".`;

    const resp = await ai.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });

    const feedback = resp.content[0].text;
    const scoreMatch = feedback.match(/[Nn]ota[:\s]+(\d+)/);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

    await sub.update({ ai_feedback: feedback, ai_score: score });
    return { ai_feedback: feedback, ai_score: score };
  }
}

module.exports = new MentorAIService();

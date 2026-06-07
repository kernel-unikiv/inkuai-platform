'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { Op }    = require('sequelize');
const {
  User, Project, Startup, Notification, Evaluation,
  AIConversation, AIPendingAction, AdminAction, Message
} = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
  console.error('Missing ANTHROPIC_API_KEY environment variable. Set ANTHROPIC_API_KEY to your Anthropic API key.');
}
const anthropic = new Anthropic({ apiKey: anthropicApiKey });

// ══ PROMPTS BASE ════════════════════════════════════════════
const SYSTEM_ADMIN = `És o INKU·AI Assistant, a IA integrada na plataforma de incubação da Universidade Kimpa Vita (IP/UNIKIVI), Angola. Candidatura FUNDECIT Edital Nº 1/2026.

PAPEL: Assistente de gestão da plataforma para o administrador.
CAPACIDADES:
- Monitorizar e analisar dados da plataforma (utilizadores, projectos, startups)
- Propor acções (aprovar/rejeitar projectos, avançar etapas, enviar notificações, suspender utilizadores)
- IMPORTANTE: NUNCA executas acções directamente. Propões sempre e aguardas confirmação do admin
- Discutir melhorias da plataforma, estratégia FUNDECIT, cumprimento de metas
- Gerar relatórios e análises
- Avaliar qualidade de projectos com base em critérios académicos

REGRAS:
1. Responde SEMPRE em Português (Angola)
2. Quando propores uma acção, usa o formato JSON especial: [ACTION:{"type":"...","target_type":"...","target_id":"...","payload":{},"reason":"..."}]
3. Sê proactivo: identifica problemas antes de serem perguntados
4. Sê específico com números e dados reais da plataforma

CONTEXTO DA PLATAFORMA: {PLATFORM_STATS}`;

const SYSTEM_PROJECT = `És o INKU·AI Assistant, a IA integrada na plataforma INKU·AI da IP/UNIKIVI, Angola.

PAPEL: Consultor de projectos de IA/Software para investigadores e estudantes.
CAPACIDADES:
- Avaliar projectos de software e IA com critérios académicos e técnicos
- Sugerir melhorias técnicas, arquitectura, metodologias
- Ajudar na documentação científica e FUNDECIT
- Dar feedback construtivo sobre o progresso
- Sugerir recursos, datasets, e abordagens de ML/DL

PROJECTO ACTUAL: {PROJECT_DATA}

REGRAS:
1. Responde SEMPRE em Português (Angola)
2. Sê técnico mas acessível
3. Dá exemplos práticos de código Python/Node.js quando relevante
4. Encoraja publicação científica e boas práticas de investigação`;

const SYSTEM_GENERAL = `És o INKU·AI Assistant da plataforma INKU·AI, IP/UNIKIVI, Angola.

PAPEL: Assistente geral para investigadores, estudantes e docentes.
CAPACIDADES:
- Ajudar com dúvidas sobre a plataforma
- Orientar sobre projectos de software e IA
- Apoiar na candidatura FUNDECIT
- Dar orientações académicas

REGRAS:
1. Responde SEMPRE em Português (Angola)
2. Sê amigável e encorajador
3. Quando não souberes algo, di-lo claramente`;

// ══ RECOLHER CONTEXTO DA PLATAFORMA ════════════════════════
async function getPlatformContext() {
  const [users, projects, startups, pendingProj] = await Promise.all([
    User.count(),
    Project.count(),
    Startup.count(),
    Project.count({ where: { status: 'submitted' } })
  ]);
  const projectsByStatus = await Project.findAll({
    attributes: ['status', [require('sequelize').fn('COUNT','*'), 'count']],
    group: ['status'], raw: true
  });
  return { users, projects, startups, pendingProj, projectsByStatus };
}

// ══ RECOLHER CONTEXTO DE PROJECTO ══════════════════════════
async function getProjectContext(projectId) {
  return Project.findByPk(projectId, {
    include: [
      { model: User,       as: 'creator',     attributes: ['id','name','email','role'] },
      { model: Evaluation, as: 'evaluations', include: [{ model: User, as:'evaluator', attributes:['name'] }] },
      { model: Startup,    as: 'startup',     attributes: ['id','name','status'] }
    ]
  });
}

// ══ EXTRAIR ACÇÕES DO TEXTO DA IA ═══════════════════════════
function extractActions(text) {
  const actions = [];
  const regex = /\[ACTION:(\{[^}]+\})\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { actions.push(JSON.parse(match[1])); } catch {}
  }
  return actions;
}

// Limpar tags [ACTION:...] do texto visível
function cleanText(text) {
  return text.replace(/\[ACTION:\{[^}]+\}\]/g, '').trim();
}

// ══ SERVIÇO PRINCIPAL ═══════════════════════════════════════
class AIService {

  // ── Iniciar ou continuar conversa ─────────────────────────
  async chat({ userId, conversationId, message, context = 'general', contextId = null }) {
    // 1. Encontrar ou criar conversa
    let conv;
    if (conversationId) {
      conv = await AIConversation.findOne({ where: { id: conversationId, user_id: userId } });
      if (!conv) throw new AppError('Conversa não encontrada.', 404);
    } else {
      const title = message.substring(0, 60) + (message.length > 60 ? '...' : '');
      conv = await AIConversation.create({ user_id: userId, context, context_id: contextId, title });
    }

    // 2. Carregar histórico
    let history = [];
    try { history = JSON.parse(conv.messages || '[]'); } catch {}

    // 3. Montar system prompt com contexto real
    let systemPrompt = SYSTEM_GENERAL;
    const user = await User.findByPk(userId, { attributes: ['name','role'] });

    if (context === 'admin_platform' || user?.role === 'admin') {
      const stats = await getPlatformContext();
      systemPrompt = SYSTEM_ADMIN.replace('{PLATFORM_STATS}',
        `Utilizadores: ${stats.users} | Projectos: ${stats.projects} | Startups: ${stats.startups} | ` +
        `Pendentes de aprovação: ${stats.pendingProj} | ` +
        `Estados: ${stats.projectsByStatus.map(p=>`${p.status}:${p.count}`).join(', ')} | ` +
        `Utilizador actual: ${user?.name} (${user?.role})`
      );
    } else if ((context === 'project_review' || context === 'project') && contextId) {
      const project = await getProjectContext(contextId);
      systemPrompt = SYSTEM_PROJECT.replace('{PROJECT_DATA}',
        project ? JSON.stringify({
          title: project.title, type: project.type, status: project.status,
          description: project.description?.substring(0, 300),
          tech_stack: project.tech_stack,
          creator: project.creator?.name,
          evaluations: project.evaluations?.length,
          avgScore: project.evaluations?.length
            ? project.evaluations.reduce((a,e)=>a+(e.score||0),0)/project.evaluations.length
            : null
        }) : 'Projecto não encontrado'
      );
    }

    // 4. Adicionar mensagem do utilizador ao histórico
    const userMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };
    history.push(userMsg);

    // 5. Chamar API Anthropic
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }));
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: apiMessages
    });

    const rawText   = response.content[0]?.text || 'Sem resposta.';
    const cleanResp = cleanText(rawText);
    const actions   = extractActions(rawText);

    // 6. Guardar resposta no histórico
    const assistantMsg = {
      role: 'assistant', content: cleanResp,
      timestamp: new Date().toISOString(),
      hasActions: actions.length > 0
    };
    history.push(assistantMsg);

    // Manter máx 40 mensagens (20 trocas)
    if (history.length > 40) history = history.slice(-40);

    await conv.update({ messages: JSON.stringify(history) });

    // 7. Guardar acções pendentes se existirem
    const pendingActions = [];
    for (const action of actions) {
      const pa = await AIPendingAction.create({
        conversation_id: conv.id,
        action_type:  action.type,
        target_type:  action.target_type,
        target_id:    action.target_id,
        payload:      JSON.stringify(action.payload || {}),
        reason:       action.reason || cleanResp.substring(0, 300)
      });
      pendingActions.push(pa);

      // Notificar admins sobre acção pendente
      const admins = await User.findAll({ where: { role: 'admin', is_active: true } });
      await Promise.all(admins.map(a => Notification.create({
        user_id: a.id, type: 'warning',
        title: `🤖 INKU·AI propõe uma acção: ${action.type}`,
        message: action.reason?.substring(0, 100) || 'A IA propõe uma alteração na plataforma.',
        action_url: '/ai-assistant.html?tab=actions'
      })));
    }

    return {
      conversation_id: conv.id,
      response: cleanResp,
      pending_actions: pendingActions,
      has_actions: actions.length > 0,
      context,
      usage: response.usage
    };
  }

  // ── Listar conversas do utilizador ────────────────────────
  async getConversations(userId, { page = 1, limit = 20 }) {
    const { count, rows } = await AIConversation.findAndCountAll({
      where: { user_id: userId, is_active: true },
      order: [['updated_at','DESC']],
      limit, offset: (page-1)*limit,
      attributes: ['id','title','context','context_id','created_at','updated_at']
    });
    return { conversations: rows, total: count };
  }

  // ── Obter histórico de uma conversa ───────────────────────
  async getConversation(conversationId, userId) {
    const conv = await AIConversation.findOne({
      where: { id: conversationId, user_id: userId }
    });
    if (!conv) throw new AppError('Conversa não encontrada.', 404);
    let messages = [];
    try { messages = JSON.parse(conv.messages || '[]'); } catch {}
    return { ...conv.toJSON(), messages };
  }

  // ── Apagar conversa ───────────────────────────────────────
  async deleteConversation(conversationId, userId) {
    const conv = await AIConversation.findOne({ where: { id: conversationId, user_id: userId } });
    if (!conv) throw new AppError('Conversa não encontrada.', 404);
    await conv.update({ is_active: false });
    return { deleted: true };
  }

  // ── Acções pendentes (para o admin ver e aprovar) ─────────
  async getPendingActions({ page = 1, limit = 20, status = 'pending' }) {
    const { count, rows } = await AIPendingAction.findAndCountAll({
      where: { status },
      order: [['created_at','DESC']],
      limit, offset: (page-1)*limit
    });
    return { actions: rows, total: count };
  }

  // ── Admin aprova ou rejeita acção proposta pela IA ────────
  async reviewAction(actionId, adminId, approved, note) {
    const action = await AIPendingAction.findByPk(actionId);
    if (!action) throw new AppError('Acção não encontrada.', 404);
    if (action.status !== 'pending') throw new AppError('Acção já foi processada.', 400);

    await action.update({
      status: approved ? 'approved' : 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date()
    });

    // Se aprovada, executar a acção
    if (approved) {
      const result = await this._executeAction(action, adminId, note);
      await AdminAction.create({
        admin_id: adminId, action: `ai_${action.action_type}`,
        target_type: action.target_type, target_id: action.target_id,
        details: JSON.stringify({ ai_proposed: true, note, result: result?.status })
      });
      return { executed: true, action, result };
    }

    // Notificar que foi rejeitada (log)
    await AdminAction.create({
      admin_id: adminId, action: 'ai_action_rejected',
      target_type: action.target_type, target_id: action.target_id,
      details: JSON.stringify({ action_type: action.action_type, note })
    });

    return { executed: false, action };
  }

  // ── Executar acção aprovada ────────────────────────────────
  async _executeAction(action, adminId, note) {
    let payload = {};
    try { payload = JSON.parse(action.payload || '{}'); } catch {}

    switch (action.action_type) {
      case 'approve_project': {
        const p = await Project.findByPk(action.target_id);
        if (p) {
          await p.update({ status: 'approved' });
          await Notification.create({
            user_id: p.created_by, type: 'success',
            title: '🤖 INKU·AI: Projecto aprovado!',
            message: `O seu projecto "${p.title}" foi aprovado com base na análise da IA. ${note||''}`,
            action_url: `/project-detail.html?id=${p.id}`
          });
        }
        return p;
      }
      case 'reject_project': {
        const p = await Project.findByPk(action.target_id);
        if (p) {
          await p.update({ status: 'rejected' });
          await Notification.create({
            user_id: p.created_by, type: 'error',
            title: '🤖 INKU·AI: Projecto não aprovado',
            message: `O seu projecto "${p.title}" necessita de melhorias. ${action.reason||note||''}`,
            action_url: `/project-detail.html?id=${p.id}`
          });
        }
        return p;
      }
      case 'advance_stage': {
        const target = action.target_type === 'project'
          ? await Project.findByPk(action.target_id)
          : await Startup.findByPk(action.target_id);
        if (target && payload.new_status) {
          await target.update({ status: payload.new_status });
          const ownerId = target.created_by || target.owner_id;
          if (ownerId) await Notification.create({
            user_id: ownerId, type: 'info',
            title: `🤖 INKU·AI: ${action.target_type === 'project' ? 'Projecto' : 'Startup'} avançou de etapa`,
            message: `Avançou para "${payload.new_status}". ${note||''}`,
            action_url: `/${action.target_type}-detail.html?id=${action.target_id}`
          });
        }
        return target;
      }
      case 'send_notification': {
        if (payload.user_id || payload.all_users) {
          const targets = payload.all_users
            ? await User.findAll({ where: { is_active: true } })
            : [{ id: payload.user_id }];
          await Promise.all(targets.map(u => Notification.create({
            user_id: u.id, type: payload.type || 'info',
            title: payload.title || '🤖 Notificação da INKU·AI',
            message: payload.message || action.reason,
            action_url: payload.url || '/dashboard.html'
          })));
        }
        return { sent: true };
      }
      case 'send_message': {
        if (payload.receiver_id) {
          const admin = await User.findByPk(adminId);
          await Message.create({
            sender_id: adminId,
            receiver_id: payload.receiver_id,
            subject: payload.subject || '🤖 Mensagem da INKU·AI',
            body: payload.body || action.reason,
            context_type: action.target_type,
            context_id: action.target_id
          });
          await Notification.create({
            user_id: payload.receiver_id, type: 'info',
            title: `Nova mensagem de ${admin?.name||'INKU·AI'}`,
            message: payload.subject || 'Tem uma nova mensagem.',
            action_url: '/messages.html'
          });
        }
        return { sent: true };
      }
      default:
        return { skipped: true, type: action.action_type };
    }
  }

  // ══ AVALIAÇÃO DE PROJECTO PELA IA ═══════════════════════════
  async evaluateProject(projectId, requesterId) {
    const project = await Project.findByPk(projectId, {
      include: [
        { model: User,       as:'creator',     attributes:['name','role'] },
        { model: Evaluation, as:'evaluations', include:[{model:User,as:'evaluator',attributes:['name']}] }
      ]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    const prompt = `Avalia este projecto de software/IA da IP/UNIKIVI para a candidatura FUNDECIT:

PROJECTO: ${project.title}
TIPO: ${project.type}
DESCRIÇÃO: ${project.description}
STACK: ${JSON.stringify(project.tech_stack)}
ESTADO: ${project.status}
CRIADOR: ${project.creator?.name}
AVALIAÇÕES ANTERIORES: ${project.evaluations?.length || 0}

Por favor avalia em:
1. RELEVÂNCIA CIENTÍFICA (0-25): Contribuição para a investigação angolana
2. VIABILIDADE TÉCNICA (0-25): Stack adequado, arquitectura, implementação
3. IMPACTO SOCIAL (0-25): Benefício para Angola e IP/UNIKIVI
4. QUALIDADE ACADÉMICA (0-25): Metodologia, documentação, potencial de publicação

Formato da resposta:
- Pontuação total: X/100
- Pontuação por critério
- Pontos fortes
- Pontos a melhorar
- Recomendação: APROVAR / REVER / REJEITAR
- Justificação detalhada`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: SYSTEM_PROJECT.replace('{PROJECT_DATA}', project.title),
      messages: [{ role: 'user', content: prompt }]
    });

    const evalText = response.content[0]?.text || '';

    // Extrair score do texto
    const scoreMatch = evalText.match(/Pontuação total:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    // Guardar avaliação na base de dados
    const evaluation = await Evaluation.create({
      project_id:   projectId,
      evaluator_id: requesterId,
      score,
      feedback: evalText,
      status: 'completed'
    });

    // Notificar o criador
    await Notification.create({
      user_id: project.created_by, type: score >= 70 ? 'success' : 'warning',
      title: `🤖 INKU·AI avaliou o seu projecto: ${score}/100`,
      message: `O projecto "${project.title}" foi avaliado automaticamente.`,
      action_url: `/project-detail.html?id=${projectId}`
    });

    return { evaluation, score, feedback: evalText };
  }

  // ══ GERAR RELATÓRIO PDF DA PLATAFORMA ══════════════════════
  async generatePlatformReport(requesterId) {
    const PDFDocument = require('pdfkit');

    // Recolher todos os dados
    const [stats, users, projects, startups, recentActions] = await Promise.all([
      getPlatformContext(),
      User.findAll({ attributes: ['id','name','email','role','is_active','created_at'], order:[['created_at','DESC']], limit: 50 }),
      Project.findAll({ include:[{model:User,as:'creator',attributes:['name']}], order:[['created_at','DESC']], limit: 50 }),
      Startup.findAll({ include:[{model:User,as:'owner',attributes:['name']}], order:[['created_at','DESC']], limit: 30 }),
      AdminAction.findAll({ include:[{model:User,as:'admin',attributes:['name']}], order:[['created_at','DESC']], limit: 20 })
    ]);

    // Pedir à IA uma análise executiva
    const analysisResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_ADMIN.replace('{PLATFORM_STATS}',
        `${stats.users} utilizadores | ${stats.projects} projectos | ${stats.startups} startups | ${stats.pendingProj} pendentes`),
      messages: [{ role:'user', content:
        `Gera uma análise executiva de 3 parágrafos sobre o estado actual da plataforma INKU·AI, ` +
        `destacando progresso face às metas FUNDECIT, pontos positivos e recomendações estratégicas.`
      }]
    });
    const aiAnalysis = analysisResp.content[0]?.text || '';

    // Gerar PDF
    return new Promise((resolve, reject) => {
      const doc    = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const BLUE  = '#1a3a6e';
      const LBLUE = '#2563eb';
      const GRAY  = '#64748b';
      const now   = new Date().toLocaleDateString('pt-PT', { day:'2-digit', month:'long', year:'numeric' });

      // ── Capa ──────────────────────────────────────────────
      doc.rect(0,0,doc.page.width,120).fill(BLUE);
      doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold')
        .text('INKU·AI — RELATÓRIO DA PLATAFORMA', 50, 35, { align:'center' });
      doc.fontSize(12).font('Helvetica')
        .text('Instituto Politécnico da Universidade Kimpa Vita (IP/UNIKIVI)', 50, 65, { align:'center' });
      doc.fontSize(10).text(`Candidatura FUNDECIT · Edital Nº 1/2026 · ${now}`, 50, 85, { align:'center' });

      doc.moveDown(3);

      // ── KPIs ──────────────────────────────────────────────
      doc.fillColor(BLUE).fontSize(16).font('Helvetica-Bold').text('INDICADORES DA PLATAFORMA', { underline:true });
      doc.moveDown(0.5);

      const kpis = [
        ['Total de Utilizadores', stats.users, '(Meta FUNDECIT: 100)'],
        ['Total de Projectos',    stats.projects, '(Meta FUNDECIT: 10 activos)'],
        ['Total de Startups',     stats.startups, '(Meta FUNDECIT: 10)'],
        ['Projectos Pendentes',   stats.pendingProj, 'aguardam aprovação'],
      ];
      kpis.forEach(([label, val, note]) => {
        doc.fillColor(GRAY).fontSize(11).font('Helvetica').text(`${label}: `, { continued:true });
        doc.fillColor(LBLUE).font('Helvetica-Bold').text(`${val}  `, { continued:true });
        doc.fillColor(GRAY).font('Helvetica').fontSize(9).text(note);
      });

      // FUNDECIT progress
      doc.moveDown(0.5);
      const progs = [
        ['Utilizadores vs meta 100', stats.users, 100],
        ['Projectos vs meta 10', stats.projects, 10],
        ['Startups vs meta 10',  stats.startups, 10],
      ];
      progs.forEach(([label, val, max]) => {
        const pct = Math.min(val/max*100, 100).toFixed(0);
        doc.fillColor(GRAY).fontSize(10).font('Helvetica').text(`${label}: ${pct}%`);
        const barX=50, barW=doc.page.width-100, barH=8;
        doc.rect(barX, doc.y, barW, barH).fillColor('#e2e8f0');
        doc.rect(barX, doc.y-barH, barW*pct/100, barH).fillColor(LBLUE);
        doc.moveDown(0.5);
      });

      // ── Análise IA ────────────────────────────────────────
      doc.addPage();
      doc.fillColor(BLUE).fontSize(16).font('Helvetica-Bold').text('ANÁLISE EXECUTIVA — INKU·AI', { underline:true });
      doc.moveDown(0.5);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(aiAnalysis, { align:'justify', lineGap:2 });

      // ── Utilizadores ──────────────────────────────────────
      doc.addPage();
      doc.fillColor(BLUE).fontSize(16).font('Helvetica-Bold').text('UTILIZADORES REGISTADOS', { underline:true });
      doc.moveDown(0.3);

      // Tabela header
      const cols = [50, 200, 370, 460];
      doc.rect(50, doc.y, doc.page.width-100, 18).fill(BLUE);
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
      ['Nome', 'Email', 'Role', 'Data'].forEach((h,i) => doc.text(h, cols[i]+4, doc.y-14));
      doc.moveDown(0.1);

      users.slice(0,30).forEach((u, idx) => {
        const bg = idx%2===0 ? '#f8fafc' : '#fff';
        doc.rect(50, doc.y, doc.page.width-100, 16).fill(bg);
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(u.name?.substring(0,22)||'—', cols[0]+4, doc.y-12);
        doc.text(u.email?.substring(0,28)||'—', cols[1]+4, doc.y-8, { lineBreak:false });
        doc.text(u.role||'—',  cols[2]+4, doc.y-8, { lineBreak:false });
        doc.text(new Date(u.created_at).toLocaleDateString('pt-PT'), cols[3]+4, doc.y-8);
      });
      if (users.length > 30) {
        doc.moveDown(0.5);
        doc.fillColor(GRAY).fontSize(9).text(`... e mais ${users.length-30} utilizadores.`);
      }

      // ── Projectos ──────────────────────────────────────────
      doc.addPage();
      doc.fillColor(BLUE).fontSize(16).font('Helvetica-Bold').text('PROJECTOS', { underline:true });
      doc.moveDown(0.3);

      const pCols = [50, 220, 350, 430, 510];
      doc.rect(50, doc.y, doc.page.width-100, 18).fill(BLUE);
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
      ['Título', 'Criador', 'Tipo', 'Estado', 'Data'].forEach((h,i) => doc.text(h, pCols[i]+4, doc.y-14));
      doc.moveDown(0.1);

      projects.slice(0,25).forEach((p, idx) => {
        const bg = idx%2===0 ? '#f8fafc' : '#fff';
        doc.rect(50, doc.y, doc.page.width-100, 16).fill(bg);
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(p.title?.substring(0,24)||'—',       pCols[0]+4, doc.y-12);
        doc.text(p.creator?.name?.substring(0,18)||'—', pCols[1]+4, doc.y-8, { lineBreak:false });
        doc.text(p.type||'—',                           pCols[2]+4, doc.y-8, { lineBreak:false });
        doc.text(p.status||'—',                         pCols[3]+4, doc.y-8, { lineBreak:false });
        doc.text(new Date(p.created_at).toLocaleDateString('pt-PT'), pCols[4]+4, doc.y-8);
      });

      // ── Startups ──────────────────────────────────────────
      doc.addPage();
      doc.fillColor(BLUE).fontSize(16).font('Helvetica-Bold').text('STARTUPS', { underline:true });
      doc.moveDown(0.3);

      const sCols = [50, 230, 360, 430, 510];
      doc.rect(50, doc.y, doc.page.width-100, 18).fill(BLUE);
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
      ['Nome', 'Fundador', 'Sector', 'Estado', 'Data'].forEach((h,i) => doc.text(h, sCols[i]+4, doc.y-14));
      doc.moveDown(0.1);

      startups.slice(0,25).forEach((s, idx) => {
        const bg = idx%2===0 ? '#f8fafc' : '#fff';
        doc.rect(50, doc.y, doc.page.width-100, 16).fill(bg);
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(s.name?.substring(0,26)||'—',          sCols[0]+4, doc.y-12);
        doc.text(s.owner?.name?.substring(0,18)||'—',   sCols[1]+4, doc.y-8, { lineBreak:false });
        doc.text((s.sector||'—').substring(0,16),        sCols[2]+4, doc.y-8, { lineBreak:false });
        doc.text(s.status||'—',                          sCols[3]+4, doc.y-8, { lineBreak:false });
        doc.text(new Date(s.created_at).toLocaleDateString('pt-PT'), sCols[4]+4, doc.y-8);
      });

      // ── Log de Acções Admin ───────────────────────────────
      doc.addPage();
      doc.fillColor(BLUE).fontSize(16).font('Helvetica-Bold').text('REGISTO DE ACÇÕES ADMINISTRATIVAS', { underline:true });
      doc.moveDown(0.3);
      recentActions.forEach((a, idx) => {
        doc.fillColor(idx%2===0?'#f8fafc':'#fff').rect(50, doc.y, doc.page.width-100, 14).fill();
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(`${new Date(a.created_at).toLocaleDateString('pt-PT')}  ${a.admin?.name||'—'}  →  ${a.action}`, 55, doc.y-10);
      });

      // ── Rodapé ────────────────────────────────────────────
      doc.addPage();
      doc.rect(0,0,doc.page.width,80).fill(BLUE);
      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
        .text('INKU·AI — Incubadora de Desenvolvimento de Software, Dados e IA', 50, 20, { align:'center' });
      doc.fontSize(10).font('Helvetica')
        .text('Instituto Politécnico da Universidade Kimpa Vita · Mbanza Kongo, Zaire, Angola', 50, 42, { align:'center' });
      doc.moveDown(2);
      doc.fillColor(GRAY).fontSize(9)
        .text(`Relatório gerado automaticamente pela INKU·AI em ${now}`, { align:'center' });
      doc.text('FUNDECIT Edital Nº 1/2026 · Tipo 1 · Investigação Científica e Desenvolvimento Experimental', { align:'center' });

      doc.end();
    });
  }

  // ══ MONITORIZAÇÃO AUTOMÁTICA ════════════════════════════════
  async runMonitoring(adminId) {
    const stats = await getPlatformContext();

    const prompt = `Analisa os dados actuais da plataforma INKU·AI e identifica problemas e oportunidades:

Dados: ${stats.users} utilizadores | ${stats.projects} projectos | ${stats.startups} startups | ${stats.pendingProj} pendentes aprovação

1. Identifica os 3 problemas mais urgentes
2. Para cada problema, propõe UMA acção concreta usando o formato [ACTION:{...}]
3. Avalia o progresso face às metas FUNDECIT (100 users / 10 projects / 10 startups)

Sê específico e directo.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_ADMIN.replace('{PLATFORM_STATS}', `${stats.users} users | ${stats.projects} projects | ${stats.pendingProj} pending`),
      messages: [{ role:'user', content: prompt }]
    });

    const text    = response.content[0]?.text || '';
    const actions = extractActions(text);
    const clean   = cleanText(text);

    // Criar conversa de monitorização
    const conv = await AIConversation.create({
      user_id: adminId, context: 'admin_platform',
      title: `Monitorização automática — ${new Date().toLocaleDateString('pt-PT')}`,
      messages: JSON.stringify([
        { role:'user',      content:'Monitorização automática da plataforma', timestamp:new Date().toISOString() },
        { role:'assistant', content:clean, timestamp:new Date().toISOString(), hasActions:actions.length>0 }
      ])
    });

    // Guardar acções propostas
    for (const action of actions) {
      await AIPendingAction.create({
        conversation_id: conv.id, action_type: action.type,
        target_type: action.target_type, target_id: action.target_id,
        payload: JSON.stringify(action.payload||{}), reason: action.reason||clean.substring(0,300)
      });
    }

    // Notificar admins
    const admins = await User.findAll({ where:{ role:'admin', is_active:true } });
    await Promise.all(admins.map(a => Notification.create({
      user_id: a.id, type: 'info',
      title: `🤖 INKU·AI: Relatório de monitorização disponível`,
      message: `${actions.length} acção(ões) proposta(s). Verifique o assistente de IA.`,
      action_url: '/ai-assistant.html'
    })));

    return { report: clean, proposed_actions: actions.length, conversation_id: conv.id };
  }
}

module.exports = new AIService();

'use strict';
// NÃO usar dotenv.config() aqui — o server.js já o faz
// No Render.com as env vars são injectadas directamente no process.env

const { Op } = require('sequelize');
const {
  User, Project, Startup, Notification, Evaluation,
  AIConversation, AIPendingAction, AdminAction, Message
} = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');

// ── Cliente Anthropic lazy ─────────────────────────────────────
let _anthropic = null;
function getClient() {
  if (_anthropic) return _anthropic;

  // Tentar obter a chave de várias formas
  const key = (process.env.ANTHROPIC_API_KEY || '').trim();

  if (!key) {
    // Diagnóstico útil
    const envKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('anthrop') || k.toLowerCase().includes('api_key'));
    throw new AppError(
      `ANTHROPIC_API_KEY não configurada no ambiente. ` +
      `Variáveis relacionadas encontradas: [${envKeys.join(', ') || 'nenhuma'}]. ` +
      `No Render.com: Dashboard → o teu serviço → Environment → Add Environment Variable → ANTHROPIC_API_KEY = sk-ant-...`,
      503
    );
  }

  const Anthropic = require('@anthropic-ai/sdk');
  // Passar a key explicitamente — nunca depender do default do SDK
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

// ══ PROMPTS ════════════════════════════════════════════════

// ADMIN: IA autónoma que monitoriza, age e só pede permissão para acções DESTRUTIVAS
const SYSTEM_ADMIN = `És o INKU·AI, o sistema de IA autónomo integrado na plataforma de incubação da IP/UNIKIVI, Angola. FUNDECIT Edital Nº 1/2026.

PAPEL: Gestor autónomo da plataforma. Trabalhas directamente com o Administrador.

AUTONOMIA:
- Podes e DEVES agir autonomamente em acções de baixo risco (notificações, análises, relatórios, mensagens de encorajamento)
- Só pedes permissão ao admin para: eliminar dados, suspender utilizadores, rejeitar projectos, alterar roles
- Quando propões uma acção urgente que requer permissão, usa: [ACTION:{"type":"...","urgent":true,...}]
- Para acções que já executaste autonomamente, informa o admin no resumo

CAPACIDADES AUTÓNOMAS (sem pedir permissão):
✅ Enviar notificações de encorajamento a utilizadores
✅ Analisar e avaliar projectos (com relatório)
✅ Identificar projectos em risco ou parados
✅ Gerar relatórios e resumos
✅ Sugerir melhorias e próximos passos
✅ Monitorizar metas FUNDECIT

REQUER PERMISSÃO DO ADMIN:
⚠️ Aprovar/rejeitar projectos oficialmente
⚠️ Suspender ou eliminar utilizadores
⚠️ Alterar estados definitivos de startups
⚠️ Enviar mensagens formais em nome da instituição

CONTEXTO ACTUAL DA PLATAFORMA:
{PLATFORM_STATS}

DADOS DO ADMIN: {ADMIN_NAME}

REGRAS:
1. Responde em Português de Angola
2. Sê directo, proactivo e analítico
3. Informa sempre o que já fizeste autonomamente
4. Usa dados reais da plataforma nas respostas
5. Prioriza metas FUNDECIT: 100 users / 10 projects / 10 startups`;

// UTILIZADOR: só ajuda a melhorar o projecto — nada mais
const SYSTEM_USER = `És o INKU·AI Assistant, um consultor especializado em projectos de software e IA da IP/UNIKIVI, Angola.

PAPEL EXCLUSIVO: Ajudar o investigador/estudante a MELHORAR O SEU PROJECTO.

O QUE FAZES:
✅ Analisar o projecto e dar feedback técnico detalhado
✅ Sugerir melhorias de arquitectura, código e metodologia
✅ Ajudar com documentação científica e relatórios FUNDECIT
✅ Recomendar tecnologias, datasets e abordagens de ML/DL
✅ Dar exemplos de código Python/JavaScript quando útil
✅ Orientar sobre boas práticas de investigação
✅ Ajudar a preparar o projecto para publicação científica

O QUE NÃO FAZES:
❌ Não falas sobre assuntos fora do projecto
❌ Não és um assistente geral
❌ Não dás acesso a dados de outros utilizadores
❌ Não tratas de assuntos administrativos

PROJECTO DO UTILIZADOR:
{PROJECT_DATA}

UTILIZADOR: {USER_NAME} ({USER_ROLE})

REGRAS:
1. Foca-te EXCLUSIVAMENTE em melhorar o projecto
2. Sê técnico mas acessível
3. Dá exemplos práticos
4. Responde em Português de Angola
5. Encoraja a excelência académica e publicação`;

// ══ CONTEXTO DA PLATAFORMA ══════════════════════════════════
async function getPlatformContext() {
  const [users, projects, startups, pendingProj, completedProj] = await Promise.all([
    User.count(),
    Project.count(),
    Startup.count(),
    Project.count({ where: { status: 'submitted' } }),
    Project.count({ where: { status: 'completed' } })
  ]);
  const projectsByStatus = await Project.findAll({
    attributes: ['status', [require('sequelize').fn('COUNT','*'), 'count']],
    group: ['status'], raw: true
  });
  const last30 = new Date(Date.now() - 30*24*60*60*1000);
  const newUsers = await User.count({ where: { created_at: { [Op.gte]: last30 } } });
  return { users, projects, startups, pendingProj, completedProj, projectsByStatus, newUsers };
}

// ══ ACÇÕES AUTÓNOMAS (sem permissão) ════════════════════════
async function executeAutonomousAction(type, payload, reason) {
  switch(type) {
    case 'notify_user': {
      if (!payload.user_id) return null;
      return Notification.create({
        user_id: payload.user_id, type: payload.notif_type || 'info',
        title: payload.title || '🤖 INKU·AI',
        message: payload.message || reason,
        action_url: payload.url || '/dashboard.html'
      });
    }
    case 'notify_all_active': {
      const users = await User.findAll({ where: { is_active: true } });
      await Promise.all(users.map(u => Notification.create({
        user_id: u.id, type: payload.notif_type || 'info',
        title: payload.title || '🤖 INKU·AI — Plataforma',
        message: payload.message || reason,
        action_url: payload.url || '/dashboard.html'
      })));
      return { sent: users.length };
    }
    default:
      return null;
  }
}

// ══ EXTRAIR ACÇÕES DO TEXTO ══════════════════════════════════
function extractActions(text) {
  const actions = [];
  const regex = /\[ACTION:(\{.*?\})\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { actions.push(JSON.parse(match[1])); } catch {}
  }
  return actions;
}
function cleanText(text) {
  return text.replace(/\[ACTION:\{.*?\}\]/gs, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ══ SERVIÇO PRINCIPAL ═══════════════════════════════════════
class AIService {

  // ── CHAT ADMIN (autónomo, acesso total) ───────────────────
  async chatAdmin({ userId, conversationId, message }) {
    const client = getClient();
    const user   = await User.findByPk(userId, { attributes: ['name','role'] });
    if (!['admin','mentor'].includes(user?.role)) throw new AppError('Acesso negado.', 403);

    // Carregar ou criar conversa
    let conv;
    if (conversationId) {
      conv = await AIConversation.findOne({ where: { id: conversationId, user_id: userId } });
    }
    if (!conv) {
      conv = await AIConversation.create({
        user_id: userId, context: 'admin_platform',
        title: message.substring(0,60)
      });
    }

    let history = [];
    try { history = JSON.parse(conv.messages || '[]'); } catch {}

    // System prompt com dados reais
    const stats = await getPlatformContext();
    const systemPrompt = SYSTEM_ADMIN
      .replace('{PLATFORM_STATS}',
        `Utilizadores: ${stats.users} (${stats.newUsers} novos este mês) | ` +
        `Projectos: ${stats.projects} (${stats.pendingProj} pendentes de aprovação, ${stats.completedProj} concluídos) | ` +
        `Startups: ${stats.startups} | ` +
        `Estados: ${stats.projectsByStatus.map(p=>`${p.status}:${p.count}`).join(', ')} | ` +
        `Metas FUNDECIT: ${Math.round(stats.users/100*100)}% users, ${Math.round(stats.projects/10*100)}% projects`)
      .replace('{ADMIN_NAME}', user.name);

    history.push({ role:'user', content:message, timestamp:new Date().toISOString() });

    const apiMsgs = history.slice(-20).map(m => ({ role:m.role, content:m.content }));
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: apiMsgs
    });

    const rawText   = response.content[0]?.text || '';
    const actions   = extractActions(rawText);
    const cleanResp = cleanText(rawText);

    // Processar acções
    const autonomous = []; // acções executadas automaticamente
    const pending    = []; // acções que precisam de aprovação

    for (const action of actions) {
      const isUrgent     = action.urgent === true;
      const isDestructive = ['delete_user','suspend_user','reject_project','delete_project','delete_startup'].includes(action.type);

      if (!isUrgent && !isDestructive && ['notify_user','notify_all_active'].includes(action.type)) {
        // Executar autonomamente
        const result = await executeAutonomousAction(action.type, action.payload||{}, action.reason||cleanResp.substring(0,200));
        autonomous.push({ ...action, executed: true, result });
      } else {
        // Guardar como pendente para o admin
        const pa = await AIPendingAction.create({
          conversation_id: conv.id,
          action_type:  action.type,
          target_type:  action.target_type,
          target_id:    action.target_id,
          payload:      JSON.stringify(action.payload||{}),
          reason:       action.reason || cleanResp.substring(0,300)
        });
        pending.push(pa);
        // Notificar o próprio admin (já está a ver o chat, mas fica no log)
        await Notification.create({
          user_id: userId, type:'warning',
          title:`⚡ INKU·AI propõe: ${action.type?.replace(/_/g,' ')}`,
          message: action.reason?.substring(0,100)||'Acção requer aprovação.',
          action_url:'/ai-assistant.html?tab=actions'
        });
      }
    }

    const assistantMsg = {
      role:'assistant', content:cleanResp,
      timestamp:new Date().toISOString(),
      autonomous_count: autonomous.length,
      pending_count: pending.length
    };
    history.push(assistantMsg);
    if (history.length > 40) history = history.slice(-40);
    await conv.update({ messages: JSON.stringify(history) });

    return {
      conversation_id: conv.id,
      response: cleanResp,
      autonomous_actions: autonomous,
      pending_actions: pending,
      has_pending: pending.length > 0,
      context: 'admin_platform'
    };
  }

  // ── CHAT UTILIZADOR (só ajuda a melhorar o projecto) ──────
  async chatUser({ userId, conversationId, message, projectId }) {
    const client  = getClient();
    const user    = await User.findByPk(userId, { attributes:['name','role','id'] });

    // Carregar ou criar conversa
    let conv;
    if (conversationId) {
      conv = await AIConversation.findOne({ where:{ id:conversationId, user_id:userId } });
    }
    if (!conv) {
      conv = await AIConversation.create({
        user_id: userId, context: 'project_review',
        context_id: projectId || null,
        title: message.substring(0,60)
      });
    }

    let history = [];
    try { history = JSON.parse(conv.messages || '[]'); } catch {}

    // Carregar dados do projecto (próprio do utilizador ou do contexto)
    let projectData = 'Nenhum projecto específico seleccionado. Pede ao utilizador que especifique o projecto.';
    const projId = projectId || conv.context_id;
    if (projId) {
      const project = await Project.findByPk(projId, {
        include: [{ model:Evaluation, as:'evaluations' }]
      });
      if (project && (project.created_by === userId || ['admin','mentor'].includes(user?.role))) {
        projectData = JSON.stringify({
          title: project.title, type: project.type, status: project.status,
          description: project.description?.substring(0,400),
          tech_stack: project.tech_stack,
          tags: project.tags,
          version: project.version,
          evaluations_count: project.evaluations?.length || 0,
          avg_score: project.evaluations?.length
            ? Math.round(project.evaluations.reduce((a,e)=>a+(e.score||0),0)/project.evaluations.length)
            : null
        });
      }
    } else {
      // Carregar projectos do utilizador
      const userProjects = await Project.findAll({
        where: { created_by: userId },
        attributes: ['id','title','type','status'],
        limit: 5
      });
      if (userProjects.length) {
        projectData = `Projectos do utilizador: ${userProjects.map(p=>`"${p.title}" (${p.status})`).join(', ')}. Perguntar qual quer discutir.`;
      }
    }

    const systemPrompt = SYSTEM_USER
      .replace('{PROJECT_DATA}', projectData)
      .replace('{USER_NAME}', user?.name || 'Investigador')
      .replace('{USER_ROLE}', user?.role || 'student');

    history.push({ role:'user', content:message, timestamp:new Date().toISOString() });

    const apiMsgs = history.slice(-20).map(m => ({ role:m.role, content:m.content }));
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: systemPrompt,
      messages: apiMsgs
    });

    const cleanResp = response.content[0]?.text || '';
    history.push({ role:'assistant', content:cleanResp, timestamp:new Date().toISOString() });
    if (history.length > 40) history = history.slice(-40);
    await conv.update({ messages: JSON.stringify(history) });

    return {
      conversation_id: conv.id,
      response: cleanResp,
      context: 'project_review'
    };
  }

  // ── MONITORIZAÇÃO AUTÓNOMA ─────────────────────────────────
  async runMonitoring(adminId) {
    const client = getClient();
    const stats  = await getPlatformContext();

    // Identificar projectos parados (submitted há mais de 7 dias)
    const staleProjects = await Project.findAll({
      where: {
        status: 'submitted',
        updated_at: { [Op.lt]: new Date(Date.now() - 7*24*60*60*1000) }
      },
      include:[{model:User,as:'creator',attributes:['id','name']}],
      limit: 5
    });

    const prompt = `Analisa a plataforma INKU·AI e actua de forma autónoma:

DADOS:
- ${stats.users} utilizadores (${stats.newUsers} novos este mês, meta: 100)
- ${stats.projects} projectos (${stats.pendingProj} pendentes >7 dias de aprovação, meta: 10 activos)
- ${stats.startups} startups (meta: 10)
- ${stats.completedProj} projectos concluídos
- Projectos parados: ${staleProjects.map(p=>`"${p.title}" (${p.creator?.name})`).join(', ') || 'nenhum'}

TAREFAS:
1. Avalia o progresso FUNDECIT (% de cada meta)
2. Identifica os 3 problemas mais críticos
3. Para cada problema com ${stats.pendingProj} projectos pendentes, usa [ACTION:{"type":"notify_all_active","payload":{"title":"...","message":"..."},"urgent":false}] para encorajar utilizadores
4. Para problemas urgentes que requerem o admin, usa [ACTION:{"type":"...","urgent":true,"reason":"..."}]
5. Dá um resumo executivo de 2 parágrafos

Sê directo e específico com números.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_ADMIN
        .replace('{PLATFORM_STATS}', `${stats.users} users | ${stats.projects} projects | ${stats.pendingProj} pending`)
        .replace('{ADMIN_NAME}', 'Sistema'),
      messages: [{ role:'user', content:prompt }]
    });

    const rawText   = response.content[0]?.text || '';
    const actions   = extractActions(rawText);
    const cleanResp = cleanText(rawText);

    const autonomous = [];
    const pending    = [];

    for (const action of actions) {
      if (!action.urgent && ['notify_user','notify_all_active'].includes(action.type)) {
        const r = await executeAutonomousAction(action.type, action.payload||{}, action.reason||'');
        autonomous.push({ ...action, result: r });
      } else {
        const pa = await AIPendingAction.create({
          action_type: action.type, target_type: action.target_type,
          target_id: action.target_id,
          payload: JSON.stringify(action.payload||{}),
          reason: action.reason || cleanResp.substring(0,200)
        });
        pending.push(pa);
      }
    }

    // Guardar conversa de monitorização
    const conv = await AIConversation.create({
      user_id: adminId, context: 'admin_platform',
      title: `Monitorização — ${new Date().toLocaleDateString('pt-PT')}`,
      messages: JSON.stringify([
        { role:'user', content:'Monitorização automática', timestamp:new Date().toISOString() },
        { role:'assistant', content:cleanResp, timestamp:new Date().toISOString() }
      ])
    });

    // Notificar admin
    const notifMsg = pending.length > 0
      ? `${autonomous.length} acções executadas automaticamente. ${pending.length} requerem a tua aprovação.`
      : `${autonomous.length} acções executadas automaticamente. Nenhuma intervenção necessária.`;
    await Notification.create({
      user_id: adminId, type: pending.length > 0 ? 'warning' : 'success',
      title: `🤖 INKU·AI — Monitorização concluída`,
      message: notifMsg,
      action_url: '/ai-assistant.html'
    });

    return {
      report: cleanResp,
      autonomous_actions: autonomous.length,
      pending_actions: pending.length,
      conversation_id: conv.id
    };
  }

  // ── AVALIAR PROJECTO ───────────────────────────────────────
  async evaluateProject(projectId, requesterId) {
    const client  = getClient();
    const project = await Project.findByPk(projectId, {
      include: [{ model:User, as:'creator', attributes:['name'] }]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    const prompt = `Avalia este projecto da IP/UNIKIVI para a candidatura FUNDECIT:

PROJECTO: ${project.title}
TIPO: ${project.type}
DESCRIÇÃO: ${project.description}
STACK: ${JSON.stringify(project.tech_stack)}
CRIADOR: ${project.creator?.name}

Avalia em 4 critérios (0-25 cada):
1. RELEVÂNCIA CIENTÍFICA: Contribuição para investigação angolana
2. VIABILIDADE TÉCNICA: Stack, arquitectura, implementação
3. IMPACTO SOCIAL: Benefício para Angola
4. QUALIDADE ACADÉMICA: Metodologia, documentação, potencial de publicação

Formato obrigatório:
**Pontuação total: X/100**
1. Relevância Científica: X/25 — [explicação]
2. Viabilidade Técnica: X/25 — [explicação]
3. Impacto Social: X/25 — [explicação]
4. Qualidade Académica: X/25 — [explicação]

**Pontos fortes:** ...
**Pontos a melhorar:** ...
**Recomendação:** APROVAR / REVER / REJEITAR
**Próximos passos:** ...`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_USER.replace('{PROJECT_DATA}', project.title).replace('{USER_NAME}','Avaliador').replace('{USER_ROLE}','admin'),
      messages: [{ role:'user', content:prompt }]
    });

    const evalText  = response.content[0]?.text || '';
    const scoreMatch = evalText.match(/Pontuação total:\s*(\d+)/i);
    const score      = scoreMatch ? parseInt(scoreMatch[1]) : 65;

    const evaluation = await Evaluation.create({
      project_id:   projectId,
      evaluator_id: requesterId,
      score, feedback: evalText, status:'completed'
    });

    await Notification.create({
      user_id: project.created_by, type: score >= 70 ? 'success' : 'warning',
      title: `🤖 INKU·AI avaliou "${project.title}": ${score}/100`,
      message: score >= 70
        ? 'Bom trabalho! O projecto tem potencial. Vê os detalhes para melhorar.'
        : 'O projecto precisa de melhorias. Vê o feedback detalhado.',
      action_url: `/project-detail.html?id=${projectId}`
    });

    return { evaluation, score, feedback: evalText };
  }

  // ── GERAR PDF ──────────────────────────────────────────────
  async generatePlatformReport(requesterId) {
    const client = getClient();
    const PDFDoc = require('pdfkit');

    const [stats, users, projects, startups, recentActions] = await Promise.all([
      getPlatformContext(),
      User.findAll({ attributes:['name','email','role','is_active','created_at'], order:[['created_at','DESC']], limit:50 }),
      Project.findAll({ include:[{model:User,as:'creator',attributes:['name']}], order:[['updated_at','DESC']], limit:50 }),
      Startup.findAll({ include:[{model:User,as:'owner',attributes:['name']}], order:[['created_at','DESC']], limit:30 }),
      AdminAction.findAll({ include:[{model:User,as:'admin',attributes:['name']}], order:[['created_at','DESC']], limit:15 })
    ]);

    // Análise executiva pela IA
    const aiRes = await client.messages.create({
      model:'claude-sonnet-4-20250514', max_tokens:600,
      system: SYSTEM_ADMIN.replace('{PLATFORM_STATS}',`${stats.users} users|${stats.projects} projects|${stats.startups} startups|${stats.pendingProj} pending`).replace('{ADMIN_NAME}','Sistema'),
      messages:[{ role:'user', content:'Escreve uma análise executiva de 3 parágrafos sobre o estado da plataforma INKU·AI, progresso FUNDECIT e recomendações. Sê específico com números.' }]
    });
    const aiAnalysis = aiRes.content[0]?.text || '';
    const now = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
    const BLUE='#1a3a6e', LBLUE='#2563eb', GRAY='#475569';

    return new Promise((resolve,reject) => {
      const doc=new PDFDoc({margin:50,size:'A4',autoFirstPage:true});
      const chunks=[];
      doc.on('data',c=>chunks.push(c));
      doc.on('end',()=>resolve(Buffer.concat(chunks)));
      doc.on('error',reject);

      // Capa
      doc.rect(0,0,595,130).fill(BLUE);
      doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold')
        .text('INKU·AI — RELATÓRIO DA PLATAFORMA',50,30,{align:'center'});
      doc.fontSize(11).font('Helvetica')
        .text('Instituto Politécnico · Universidade Kimpa Vita · Mbanza Kongo, Angola',50,58,{align:'center'});
      doc.fontSize(10)
        .text(`FUNDECIT · Edital Nº 1/2026 · Gerado em ${now}`,50,78,{align:'center'});

      // KPIs
      doc.moveDown(3);
      doc.fillColor(BLUE).fontSize(14).font('Helvetica-Bold').text('INDICADORES DA PLATAFORMA',{underline:true});
      doc.moveDown(0.4);
      const kpis=[
        [`Utilizadores registados`,stats.users,`/ 100 (${Math.round(stats.users)}%)`],
        [`Projectos`,stats.projects,`(${stats.pendingProj} pendentes de aprovação)`],
        [`Startups incubadas`,stats.startups,`/ 10 (meta FUNDECIT)`],
        [`Projectos concluídos`,stats.completedProj,`(protótipos transferíveis)`],
        [`Novos utilizadores (30 dias)`,stats.newUsers,''],
      ];
      kpis.forEach(([label,val,note])=>{
        doc.fillColor(GRAY).fontSize(11).font('Helvetica').text(`${label}: `,{continued:true});
        doc.fillColor(LBLUE).font('Helvetica-Bold').text(`${val}  `,{continued:true});
        doc.fillColor(GRAY).font('Helvetica').fontSize(9).text(note||'');
      });

      // Barras FUNDECIT
      doc.moveDown(0.5);
      [[`Utilizadores`,stats.users,100],[`Projectos`,stats.projects,10],[`Startups`,stats.startups,10]].forEach(([l,v,m])=>{
        const pct=Math.min(v/m*100,100);
        doc.fillColor(GRAY).fontSize(10).text(`${l}: ${pct.toFixed(0)}%`);
        const y=doc.y, bw=doc.page.width-100;
        doc.rect(50,y,bw,8).fillColor('#e2e8f0');
        doc.rect(50,y,bw*pct/100,8).fillColor(pct>=100?'#16a34a':LBLUE);
        doc.moveDown(0.6);
      });

      // Análise IA
      doc.addPage();
      doc.fillColor(BLUE).fontSize(14).font('Helvetica-Bold').text('ANÁLISE EXECUTIVA — INKU·AI',{underline:true});
      doc.moveDown(0.4);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(aiAnalysis,{align:'justify',lineGap:3});

      // Utilizadores
      doc.addPage();
      doc.fillColor(BLUE).fontSize(14).font('Helvetica-Bold').text('UTILIZADORES',{underline:true});
      doc.moveDown(0.3);
      const uCols=[50,200,370,460];
      doc.rect(50,doc.y,495,18).fill(BLUE);
      ['Nome','Email','Role','Registado'].forEach((h,i)=>{
        doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text(h,uCols[i]+4,doc.y-14,{lineBreak:false});
      });
      doc.moveDown(0.1);
      users.slice(0,30).forEach((u,idx)=>{
        if(doc.y>720){doc.addPage();}
        doc.rect(50,doc.y,495,15).fill(idx%2===0?'#f8fafc':'#fff');
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        [u.name?.substring(0,22)||'—',u.email?.substring(0,28)||'—',u.role||'—',new Date(u.created_at).toLocaleDateString('pt-PT')].forEach((v,i)=>{
          doc.text(v,uCols[i]+4,doc.y-11,{lineBreak:false});
        });
        doc.moveDown(0.1);
      });

      // Projectos
      doc.addPage();
      doc.fillColor(BLUE).fontSize(14).font('Helvetica-Bold').text('PROJECTOS',{underline:true});
      doc.moveDown(0.3);
      const pCols=[50,220,360,430,510];
      doc.rect(50,doc.y,495,18).fill(BLUE);
      ['Título','Criador','Tipo','Estado','Data'].forEach((h,i)=>{
        doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text(h,pCols[i]+4,doc.y-14,{lineBreak:false});
      });
      doc.moveDown(0.1);
      projects.slice(0,25).forEach((p,idx)=>{
        if(doc.y>720){doc.addPage();}
        doc.rect(50,doc.y,495,15).fill(idx%2===0?'#f8fafc':'#fff');
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        [p.title?.substring(0,24)||'—',p.creator?.name?.substring(0,18)||'—',p.type||'—',p.status||'—',new Date(p.created_at).toLocaleDateString('pt-PT')].forEach((v,i)=>{
          doc.text(v,pCols[i]+4,doc.y-11,{lineBreak:false});
        });
        doc.moveDown(0.1);
      });

      // Startups
      doc.addPage();
      doc.fillColor(BLUE).fontSize(14).font('Helvetica-Bold').text('STARTUPS',{underline:true});
      doc.moveDown(0.3);
      startups.slice(0,25).forEach((s,idx)=>{
        if(doc.y>720){doc.addPage();}
        doc.rect(50,doc.y,495,15).fill(idx%2===0?'#f8fafc':'#fff');
        doc.fillColor('#334155').fontSize(8).font('Helvetica').text(`${s.name?.substring(0,30)||'—'}  |  ${s.owner?.name||'—'}  |  ${s.status||'—'}  |  ${new Date(s.created_at).toLocaleDateString('pt-PT')}`,55,doc.y-11);
        doc.moveDown(0.1);
      });

      // Rodapé
      doc.addPage();
      doc.rect(0,0,595,90).fill(BLUE);
      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
        .text('INKU·AI — Incubadora de Software, Dados e Inteligência Artificial',50,20,{align:'center'});
      doc.fontSize(10).font('Helvetica')
        .text('IP/UNIKIVI · Mbanza Kongo · Zaire · Angola',50,45,{align:'center'});
      doc.moveDown(2);
      doc.fillColor(GRAY).fontSize(9)
        .text(`Relatório gerado por INKU·AI em ${now}`,{align:'center'});
      doc.text('FUNDECIT · Edital Nº 1/2026 · Tipo 1',{align:'center'});
      doc.end();
    });
  }

  // ── Listar conversas ───────────────────────────────────────
  async getConversations(userId, { page=1, limit=20 }) {
    const { count, rows } = await AIConversation.findAndCountAll({
      where:{user_id:userId,is_active:true},
      order:[['updated_at','DESC']], limit, offset:(page-1)*limit,
      attributes:['id','title','context','context_id','created_at','updated_at']
    });
    return { conversations:rows, total:count };
  }

  async getConversation(conversationId, userId) {
    const conv = await AIConversation.findOne({ where:{id:conversationId,user_id:userId} });
    if (!conv) throw new AppError('Conversa não encontrada.',404);
    let messages=[];
    try{messages=JSON.parse(conv.messages||'[]');}catch{}
    return {...conv.toJSON(),messages};
  }

  async deleteConversation(conversationId, userId) {
    const conv = await AIConversation.findOne({where:{id:conversationId,user_id:userId}});
    if(!conv) throw new AppError('Conversa não encontrada.',404);
    await conv.update({is_active:false});
    return {deleted:true};
  }

  async getPendingActions({page=1,limit=20,status='pending'}) {
    const {count,rows} = await AIPendingAction.findAndCountAll({
      where:{status}, order:[['created_at','DESC']], limit, offset:(page-1)*limit
    });
    return {actions:rows,total:count};
  }

  async reviewAction(actionId,adminId,approved,note) {
    const action = await AIPendingAction.findByPk(actionId);
    if(!action) throw new AppError('Acção não encontrada.',404);
    if(action.status!=='pending') throw new AppError('Já processada.',400);
    await action.update({status:approved?'approved':'rejected',reviewed_by:adminId,reviewed_at:new Date()});
    if(approved) {
      // Executar acção aprovada
      const payload = JSON.parse(action.payload||'{}');
      switch(action.action_type) {
        case 'approve_project': {
          const p=await Project.findByPk(action.target_id);
          if(p){await p.update({status:'approved'});await Notification.create({user_id:p.created_by,type:'success',title:'🎉 Projecto aprovado!',message:`"${p.title}" foi aprovado. ${note||''}`,action_url:`/project-detail.html?id=${p.id}`});}
          break;
        }
        case 'reject_project': {
          const p=await Project.findByPk(action.target_id);
          if(p){await p.update({status:'rejected'});await Notification.create({user_id:p.created_by,type:'error',title:'Projecto não aprovado',message:`"${p.title}" precisa de melhorias. ${action.reason||note||''}`,action_url:`/project-detail.html?id=${p.id}`});}
          break;
        }
        case 'suspend_user': {
          const u=await User.findByPk(action.target_id);
          if(u&&u.role!=='admin'){await u.update({is_active:false});await Notification.create({user_id:action.target_id,type:'error',title:'Conta suspensa',message:`A sua conta foi suspensa. ${note||''}`,action_url:'/login.html'});}
          break;
        }
        case 'advance_stage': {
          const target = action.target_type==='project'?await Project.findByPk(action.target_id):await Startup.findByPk(action.target_id);
          if(target&&payload.new_status){await target.update({status:payload.new_status});}
          break;
        }
        case 'send_message': {
          if(payload.receiver_id){await Message.create({sender_id:adminId,receiver_id:payload.receiver_id,subject:payload.subject||'INKU·AI',body:payload.body||action.reason});}
          break;
        }
      }
      await AdminAction.create({admin_id:adminId,action:`ai_approved_${action.action_type}`,target_type:action.target_type,target_id:action.target_id,details:JSON.stringify({note})});
    }
    return {executed:approved,action};
  }
}

module.exports = new AIService();

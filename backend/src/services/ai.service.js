'use strict';
// ── Google Gemini AI ─────────────────────────────────────────
// Chave GRATUITA: https://aistudio.google.com/apikey
// Variável de ambiente: GEMINI_API_KEY

const { Op } = require('sequelize');
const {
  User, Project, Startup, Notification, Evaluation,
  AIConversation, AIPendingAction, AdminAction, Message
} = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');

// ── Cliente Gemini lazy ───────────────────────────────────────
let _model = null;

function getModel() {
  if (_model) return _model;
  const key = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ''
  ).trim();
  if (!key) {
    throw new AppError(
      'GEMINI_API_KEY não configurada. ' +
      'Obtenha gratuitamente em https://aistudio.google.com/apikey ' +
      'e adicione no Render: Dashboard → Environment → GEMINI_API_KEY = AIzaSy...',
      503
    );
  }
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  _model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro-latest',
    generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
  });
  return _model;
}

// ── Chamar Gemini com histórico ───────────────────────────────
async function callGemini(systemInstruction, history, userMessage) {
  const model = getModel();
  const contents = [
    ...history.slice(-18).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }]
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];

  const result = await model.generateContent({
    systemInstruction,
    contents
  });

  return result.response.text();
}

// ══ PROMPTS ══════════════════════════════════════════════════

const PROMPT_ADMIN = `És o INKU·AI, o sistema de IA autónomo da plataforma IP/UNIKIVI, Angola. FUNDECIT Edital Nº 1/2026.

PAPEL: Gestor autónomo da plataforma. Trabalhas com o Administrador.

AUTONOMIA:
- Actua sozinho para: notificações de encorajamento, análises, relatórios
- Pede permissão para: suspender utilizadores, rejeitar projectos, acções destrutivas
- Para acções autónomas: [ACTION:{"type":"notify_all_active","urgent":false,"payload":{"title":"...","message":"..."}}]
- Para acções que precisam admin: [ACTION:{"type":"...","urgent":true,"target_type":"...","target_id":"...","reason":"..."}]

PLATAFORMA: {STATS}
ADMIN: {ADMIN}

Responde em Português de Angola. Sê directo e usa dados reais.`;

const PROMPT_USER = `És o INKU·AI Assistant da IP/UNIKIVI, Angola.

PAPEL EXCLUSIVO: Ajudar o utilizador a MELHORAR O SEU PROJECTO de software/IA.

FAZES:
- Feedback técnico detalhado sobre o projecto
- Sugestões de arquitectura, código, metodologia
- Apoio em documentação científica e FUNDECIT
- Exemplos de código Python/JavaScript quando útil
- Orientação sobre IA/ML, datasets, publicação científica

NÃO FAZES:
- Não tratas de assuntos fora do projecto
- Não acedes a dados de outros utilizadores

PROJECTO: {PROJECT}
UTILIZADOR: {NAME} ({ROLE})

Responde em Português de Angola. Foca-te exclusivamente em melhorar o projecto.`;

// ══ CONTEXTO ═════════════════════════════════════════════════
async function getStats() {
  const [users, projects, startups, pending, completed] = await Promise.all([
    User.count(), Project.count(), Startup.count(),
    Project.count({ where: { status: 'submitted' } }),
    Project.count({ where: { status: 'completed' } })
  ]);
  const last30    = new Date(Date.now() - 30*24*60*60*1000);
  const newUsers  = await User.count({ where: { created_at: { [Op.gte]: last30 } } });
  const byStatus  = await Project.findAll({
    attributes: ['status',[require('sequelize').fn('COUNT','*'),'count']],
    group: ['status'], raw: true
  });
  return { users, projects, startups, pending, completed, newUsers, byStatus };
}

function extractActions(text) {
  const out = [], re = /\[ACTION:(\{[^[\]]*?\})\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try { out.push(JSON.parse(m[1])); } catch {}
  }
  return out;
}
function clean(text) {
  return text.replace(/\[ACTION:\{[^[\]]*?\}\]/g,'').replace(/\n{3,}/g,'\n\n').trim();
}

// ══ ACÇÕES AUTÓNOMAS ═════════════════════════════════════════
async function execAuto(type, payload, reason) {
  if (type === 'notify_user' && payload.user_id) {
    return Notification.create({
      user_id: payload.user_id, type: payload.notif_type||'info',
      title: payload.title||'🤖 INKU·AI', message: payload.message||reason,
      action_url: payload.url||'/dashboard.html'
    });
  }
  if (type === 'notify_all_active') {
    const users = await User.findAll({ where: { is_active:true } });
    await Promise.all(users.map(u => Notification.create({
      user_id: u.id, type: payload.notif_type||'info',
      title: payload.title||'🤖 INKU·AI', message: payload.message||reason,
      action_url: payload.url||'/dashboard.html'
    })));
    return { sent: users.length };
  }
  return null;
}

// ══ SERVIÇO ══════════════════════════════════════════════════
class AIService {

  // ── Chat Admin ─────────────────────────────────────────────
  async chatAdmin({ userId, conversationId, message }) {
    const user = await User.findByPk(userId, { attributes:['name','role'] });
    if (!['admin','mentor'].includes(user?.role)) throw new AppError('Acesso negado.', 403);

    let conv = conversationId
      ? await AIConversation.findOne({ where:{ id:conversationId, user_id:userId } })
      : null;
    if (!conv) conv = await AIConversation.create({
      user_id:userId, context:'admin_platform', title:message.substring(0,60)
    });

    let history = [];
    try { history = JSON.parse(conv.messages||'[]'); } catch {}

    const stats = await getStats();
    const sys   = PROMPT_ADMIN
      .replace('{STATS}',
        `${stats.users} utilizadores (${stats.newUsers} novos, meta:100) | ` +
        `${stats.projects} projectos (${stats.pending} pendentes, ${stats.completed} concluídos, meta:10) | ` +
        `${stats.startups} startups (meta:10) | ` +
        `Estados: ${stats.byStatus.map(p=>`${p.status}:${p.count}`).join(', ')}`)
      .replace('{ADMIN}', user.name);

    const raw      = await callGemini(sys, history, message);
    const actions  = extractActions(raw);
    const response = clean(raw);

    const autonomous = [], pending = [];
    for (const a of actions) {
      const destructive = ['delete_user','suspend_user','reject_project','delete_project'].includes(a.type);
      if (!a.urgent && !destructive && ['notify_user','notify_all_active'].includes(a.type)) {
        const r = await execAuto(a.type, a.payload||{}, a.reason||response.substring(0,150));
        autonomous.push({ ...a, executed:true, result:r });
      } else {
        const pa = await AIPendingAction.create({
          conversation_id: conv.id, action_type:a.type,
          target_type:a.target_type, target_id:a.target_id,
          payload:JSON.stringify(a.payload||{}), reason:a.reason||response.substring(0,200)
        });
        pending.push(pa);
        await Notification.create({
          user_id:userId, type:'warning',
          title:`⚡ INKU·AI propõe: ${(a.type||'').replace(/_/g,' ')}`,
          message: (a.reason||'Acção requer aprovação.').substring(0,100),
          action_url:'/ai-assistant.html?tab=actions'
        });
      }
    }

    history.push({ role:'user',      content:message,  timestamp:new Date().toISOString() });
    history.push({ role:'assistant', content:response, timestamp:new Date().toISOString() });
    if (history.length > 40) history = history.slice(-40);
    await conv.update({ messages:JSON.stringify(history) });

    return {
      conversation_id:   conv.id, response,
      autonomous_actions: autonomous, pending_actions: pending,
      has_pending:        pending.length > 0, context:'admin_platform'
    };
  }

  // ── Chat Utilizador ────────────────────────────────────────
  async chatUser({ userId, conversationId, message, projectId }) {
    const user = await User.findByPk(userId, { attributes:['name','role'] });

    let conv = conversationId
      ? await AIConversation.findOne({ where:{ id:conversationId, user_id:userId } })
      : null;
    if (!conv) conv = await AIConversation.create({
      user_id:userId, context:'project_review',
      context_id:projectId||null, title:message.substring(0,60)
    });

    let history = [];
    try { history = JSON.parse(conv.messages||'[]'); } catch {}

    // Contexto do projecto
    let projectData = 'Sem projecto seleccionado. Pergunta ao utilizador qual projecto quer discutir.';
    const pid = projectId || conv.context_id;
    if (pid) {
      const p = await Project.findByPk(pid, { include:[{model:Evaluation,as:'evaluations'}] });
      if (p && (p.created_by===userId || ['admin','mentor'].includes(user?.role))) {
        projectData = JSON.stringify({
          title:p.title, type:p.type, status:p.status,
          description:p.description?.substring(0,400),
          tech_stack:p.tech_stack, version:p.version,
          evaluations:p.evaluations?.length||0,
          avg_score:p.evaluations?.length
            ? Math.round(p.evaluations.reduce((a,e)=>a+(e.score||0),0)/p.evaluations.length)
            : null
        });
      }
    } else {
      const ps = await Project.findAll({ where:{created_by:userId}, attributes:['id','title','type','status'], limit:5 });
      if (ps.length) projectData = `Projectos: ${ps.map(p=>`"${p.title}" (${p.status})`).join(', ')}. Perguntar qual quer discutir.`;
    }

    const sys = PROMPT_USER
      .replace('{PROJECT}', projectData)
      .replace('{NAME}', user?.name||'Investigador')
      .replace('{ROLE}', user?.role||'student');

    const response = await callGemini(sys, history, message);
    history.push({ role:'user',      content:message,  timestamp:new Date().toISOString() });
    history.push({ role:'assistant', content:response, timestamp:new Date().toISOString() });
    if (history.length > 40) history = history.slice(-40);
    await conv.update({ messages:JSON.stringify(history) });

    return { conversation_id:conv.id, response, context:'project_review' };
  }

  // ── Monitorização ──────────────────────────────────────────
  async runMonitoring(adminId) {
    const stats  = await getStats();
    const stale  = await Project.findAll({
      where:{ status:'submitted', updated_at:{ [Op.lt]:new Date(Date.now()-7*24*60*60*1000) } },
      include:[{model:User,as:'creator',attributes:['name']}], limit:5
    });

    const msg =
      `Analisa a plataforma INKU·AI:\n` +
      `- ${stats.users} utilizadores (${stats.newUsers} novos, meta:100)\n` +
      `- ${stats.projects} projectos (${stats.pending} pendentes >7 dias, ${stats.completed} concluídos, meta:10)\n` +
      `- ${stats.startups} startups (meta:10)\n` +
      `- Projectos parados: ${stale.map(p=>`"${p.title}"`).join(', ')||'nenhum'}\n\n` +
      `Tarefas:\n` +
      `1. Avalia progresso FUNDECIT em %\n` +
      `2. Identifica 3 problemas críticos\n` +
      `3. Para encorajar: [ACTION:{"type":"notify_all_active","urgent":false,"payload":{"title":"🎯 INKU·AI","message":"..."}}]\n` +
      `4. Para acções urgentes: [ACTION:{"type":"...","urgent":true,"reason":"..."}]\n` +
      `5. Resumo executivo de 2 parágrafos`;

    const raw      = await callGemini(PROMPT_ADMIN.replace('{STATS}','ver mensagem').replace('{ADMIN}','Sistema'), [], msg);
    const actions  = extractActions(raw);
    const response = clean(raw);

    const autonomous=[], pending=[];
    for (const a of actions) {
      if (!a.urgent && ['notify_user','notify_all_active'].includes(a.type)) {
        const r = await execAuto(a.type, a.payload||{}, a.reason||'');
        autonomous.push({...a, result:r});
      } else {
        const pa = await AIPendingAction.create({
          action_type:a.type, target_type:a.target_type,
          target_id:a.target_id, payload:JSON.stringify(a.payload||{}),
          reason:a.reason||response.substring(0,200)
        });
        pending.push(pa);
      }
    }

    const conv = await AIConversation.create({
      user_id:adminId, context:'admin_platform',
      title:`Monitorização — ${new Date().toLocaleDateString('pt-PT')}`,
      messages:JSON.stringify([
        {role:'user',content:'Monitorização automática',timestamp:new Date().toISOString()},
        {role:'assistant',content:response,timestamp:new Date().toISOString()}
      ])
    });

    await Notification.create({
      user_id:adminId, type:pending.length>0?'warning':'success',
      title:'🤖 INKU·AI — Monitorização concluída',
      message:pending.length>0
        ? `${autonomous.length} acções autónomas + ${pending.length} aguardam aprovação`
        : `${autonomous.length} acções executadas. Sem intervenção necessária.`,
      action_url:'/ai-assistant.html'
    });

    return { report:response, autonomous_actions:autonomous.length, pending_actions:pending.length, conversation_id:conv.id };
  }

  // ── Avaliar Projecto ───────────────────────────────────────
  async evaluateProject(projectId, requesterId) {
    const project = await Project.findByPk(projectId, {
      include:[{model:User,as:'creator',attributes:['name']}]
    });
    if (!project) throw new AppError('Projecto não encontrado.',404);

    const prompt =
      `Avalia este projecto FUNDECIT/IP/UNIKIVI:\n\n` +
      `Título: ${project.title}\nTipo: ${project.type}\n` +
      `Descrição: ${project.description}\nStack: ${JSON.stringify(project.tech_stack)}\n` +
      `Criador: ${project.creator?.name}\n\n` +
      `Avalia 4 critérios (0-25 pts cada):\n` +
      `1. Relevância Científica: contribuição investigação angolana\n` +
      `2. Viabilidade Técnica: stack, arquitectura, implementação\n` +
      `3. Impacto Social: benefício para Angola\n` +
      `4. Qualidade Académica: metodologia, documentação, publicação\n\n` +
      `Formato:\n**Pontuação total: X/100**\n1. Relevância: X/25 — ...\n2. Técnica: X/25 — ...\n3. Impacto: X/25 — ...\n4. Académica: X/25 — ...\n\n**Pontos fortes:** ...\n**Melhorar:** ...\n**Recomendação:** APROVAR/REVER/REJEITAR\n**Próximos passos:** ...`;

    const evalText  = await callGemini(PROMPT_USER.replace('{PROJECT}','').replace('{NAME}','Avaliador').replace('{ROLE}','admin'), [], prompt);
    const match     = evalText.match(/Pontuação total:\s*(\d+)/i);
    const score     = match ? parseInt(match[1]) : 65;

    const evaluation = await Evaluation.create({
      project_id:projectId, evaluator_id:requesterId,
      score, feedback:evalText, status:'completed'
    });

    await Notification.create({
      user_id:project.created_by, type:score>=70?'success':'warning',
      title:`🤖 INKU·AI avaliou "${project.title}": ${score}/100`,
      message:score>=70?'Bom trabalho! Consulta o feedback para melhorar ainda mais.':'O projecto precisa de melhorias. Consulta o feedback.',
      action_url:`/project-detail.html?id=${projectId}`
    });

    return { evaluation, score, feedback:evalText };
  }

  // ── Gerar PDF ──────────────────────────────────────────────
  async generatePlatformReport(requesterId) {
    const PDFDoc = require('pdfkit');
    const [stats, users, projects, startups] = await Promise.all([
      getStats(),
      User.findAll({ attributes:['name','email','role','created_at'], order:[['created_at','DESC']], limit:50 }),
      Project.findAll({ include:[{model:User,as:'creator',attributes:['name']}], order:[['updated_at','DESC']], limit:50 }),
      Startup.findAll({ include:[{model:User,as:'owner',attributes:['name']}], order:[['created_at','DESC']], limit:30 })
    ]);

    const aiPrompt =
      `Análise executiva da plataforma INKU·AI em 3 parágrafos:\n` +
      `${stats.users} utilizadores (meta 100), ${stats.projects} projectos (meta 10), ${stats.startups} startups (meta 10), ${stats.pending} pendentes.\n` +
      `Destaca progressos, pontos positivos e 3 recomendações estratégicas FUNDECIT.`;
    const analysis = await callGemini(PROMPT_ADMIN.replace('{STATS}','ver prompt').replace('{ADMIN}','Sistema'), [], aiPrompt);

    const now=new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
    const B='#1a3a6e',LB='#2563eb',G='#475569';

    return new Promise((resolve,reject)=>{
      const doc=new PDFDoc({margin:50,size:'A4'});
      const chunks=[]; doc.on('data',c=>chunks.push(c)); doc.on('end',()=>resolve(Buffer.concat(chunks))); doc.on('error',reject);

      // Capa
      doc.rect(0,0,595,130).fill(B);
      doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold').text('INKU·AI — RELATÓRIO DA PLATAFORMA',50,30,{align:'center'});
      doc.fontSize(11).font('Helvetica').text('Instituto Politécnico · Universidade Kimpa Vita · Angola',50,58,{align:'center'});
      doc.fontSize(10).text(`FUNDECIT · Edital Nº 1/2026 · ${now}`,50,78,{align:'center'});
      doc.moveDown(3);

      // KPIs
      doc.fillColor(B).fontSize(14).font('Helvetica-Bold').text('INDICADORES',{underline:true});
      doc.moveDown(0.4);
      [[`Utilizadores`,stats.users,100],[`Projectos`,stats.projects,10],[`Startups`,stats.startups,10]].forEach(([l,v,m])=>{
        const p=Math.min(v/m*100,100);
        doc.fillColor(G).fontSize(10).font('Helvetica').text(`${l}: `,{continued:true});
        doc.fillColor(LB).font('Helvetica-Bold').text(`${v}`,{continued:true});
        doc.fillColor(G).font('Helvetica').fontSize(9).text(`  (${p.toFixed(0)}% da meta)`);
        const y=doc.y,bw=doc.page.width-100;
        doc.rect(50,y,bw,7).fillColor('#e2e8f0');
        doc.rect(50,y,bw*p/100,7).fillColor(p>=100?'#16a34a':LB);
        doc.moveDown(0.5);
      });

      // Análise IA
      doc.addPage();
      doc.fillColor(B).fontSize(14).font('Helvetica-Bold').text('ANÁLISE EXECUTIVA — INKU·AI (Gemini)',{underline:true});
      doc.moveDown(0.4);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(analysis,{align:'justify',lineGap:3});

      // Utilizadores
      doc.addPage();
      doc.fillColor(B).fontSize(14).font('Helvetica-Bold').text('UTILIZADORES',{underline:true});
      doc.moveDown(0.3);
      const uC=[50,200,370,460];
      doc.rect(50,doc.y,495,18).fill(B);
      ['Nome','Email','Role','Data'].forEach((h,i)=>{doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text(h,uC[i]+4,doc.y-14,{lineBreak:false});});
      doc.moveDown(0.1);
      users.slice(0,28).forEach((u,i)=>{
        if(doc.y>710)doc.addPage();
        doc.rect(50,doc.y,495,15).fill(i%2===0?'#f8fafc':'#fff');
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        [u.name?.substring(0,22)||'—',u.email?.substring(0,26)||'—',u.role||'—',new Date(u.created_at).toLocaleDateString('pt-PT')]
          .forEach((v,j)=>{doc.text(v,uC[j]+4,doc.y-11,{lineBreak:false});});
        doc.moveDown(0.1);
      });

      // Projectos
      doc.addPage();
      doc.fillColor(B).fontSize(14).font('Helvetica-Bold').text('PROJECTOS',{underline:true});
      doc.moveDown(0.3);
      const pC=[50,220,360,430,510];
      doc.rect(50,doc.y,495,18).fill(B);
      ['Título','Criador','Tipo','Estado','Data'].forEach((h,i)=>{doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text(h,pC[i]+4,doc.y-14,{lineBreak:false});});
      doc.moveDown(0.1);
      projects.slice(0,25).forEach((p,i)=>{
        if(doc.y>710)doc.addPage();
        doc.rect(50,doc.y,495,15).fill(i%2===0?'#f8fafc':'#fff');
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        [p.title?.substring(0,24)||'—',p.creator?.name?.substring(0,16)||'—',p.type||'—',p.status||'—',new Date(p.created_at).toLocaleDateString('pt-PT')]
          .forEach((v,j)=>{doc.text(v,pC[j]+4,doc.y-11,{lineBreak:false});});
        doc.moveDown(0.1);
      });

      // Rodapé
      doc.addPage();
      doc.rect(0,0,595,90).fill(B);
      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold').text('INKU·AI — Incubadora de Software, Dados e IA',50,18,{align:'center'});
      doc.fontSize(10).font('Helvetica').text('IP/UNIKIVI · Mbanza Kongo · Zaire · Angola',50,44,{align:'center'});
      doc.moveDown(2);
      doc.fillColor(G).fontSize(9).text(`Gerado por INKU·AI (Google Gemini) em ${now}`,{align:'center'});
      doc.text('FUNDECIT · Edital Nº 1/2026 · Tipo 1',{align:'center'});
      doc.end();
    });
  }

  // ── Conversas ──────────────────────────────────────────────
  async getConversations(userId,{page=1,limit=20}) {
    const {count,rows}=await AIConversation.findAndCountAll({
      where:{user_id:userId,is_active:true}, order:[['updated_at','DESC']],
      limit, offset:(page-1)*limit, attributes:['id','title','context','context_id','created_at','updated_at']
    });
    return {conversations:rows,total:count};
  }
  async getConversation(id,userId) {
    const c=await AIConversation.findOne({where:{id,user_id:userId}});
    if(!c) throw new AppError('Conversa não encontrada.',404);
    let messages=[]; try{messages=JSON.parse(c.messages||'[]');}catch{}
    return {...c.toJSON(),messages};
  }
  async deleteConversation(id,userId) {
    const c=await AIConversation.findOne({where:{id,user_id:userId}});
    if(!c) throw new AppError('Não encontrada.',404);
    await c.update({is_active:false}); return {deleted:true};
  }
  async getPendingActions({page=1,limit=20,status='pending'}) {
    const {count,rows}=await AIPendingAction.findAndCountAll({where:{status},order:[['created_at','DESC']],limit,offset:(page-1)*limit});
    return {actions:rows,total:count};
  }
  async reviewAction(actionId,adminId,approved,note) {
    const a=await AIPendingAction.findByPk(actionId);
    if(!a) throw new AppError('Não encontrada.',404);
    if(a.status!=='pending') throw new AppError('Já processada.',400);
    await a.update({status:approved?'approved':'rejected',reviewed_by:adminId,reviewed_at:new Date()});
    if(approved){
      const pl=JSON.parse(a.payload||'{}');
      const notify=async(uid,type,title,msg,url)=>Notification.create({user_id:uid,type,title,message:msg,action_url:url});
      if(a.action_type==='approve_project'){const p=await Project.findByPk(a.target_id);if(p){await p.update({status:'approved'});await notify(p.created_by,'success','🎉 Projecto aprovado!',`"${p.title}" aprovado. ${note||''}`,`/project-detail.html?id=${p.id}`);}}
      if(a.action_type==='reject_project'){const p=await Project.findByPk(a.target_id);if(p){await p.update({status:'rejected'});await notify(p.created_by,'error','Projecto não aprovado',`"${p.title}": ${a.reason||note||''}`,`/project-detail.html?id=${p.id}`);}}
      if(a.action_type==='suspend_user'){const u=await User.findByPk(a.target_id);if(u&&u.role!=='admin'){await u.update({is_active:false});await notify(a.target_id,'error','Conta suspensa',note||'Suspensa pelo admin.','/login.html');}}
      if(a.action_type==='advance_stage'){const t=a.target_type==='project'?await Project.findByPk(a.target_id):await Startup.findByPk(a.target_id);if(t&&pl.new_status)await t.update({status:pl.new_status});}
      if(a.action_type==='send_message'&&pl.receiver_id)await Message.create({sender_id:adminId,receiver_id:pl.receiver_id,subject:pl.subject||'INKU·AI',body:pl.body||a.reason});
      await AdminAction.create({admin_id:adminId,action:`ai_${a.action_type}`,target_type:a.target_type,target_id:a.target_id,details:JSON.stringify({note})});
    }
    return {executed:approved,action:a};
  }
}

module.exports = new AIService();

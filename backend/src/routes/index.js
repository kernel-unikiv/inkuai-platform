'use strict';
const router     = require('express').Router();
const { authenticate }  = require('../middleware/auth.middleware');
const { authorize }     = require('../middleware/role.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');
const adminCtrl  = require('../controllers/admin.controller');
const Anthropic  = require('@anthropic-ai/sdk');

// ── Auth
router.use('/auth', rateLimitMiddleware.auth, require('./auth.routes'));

// ── AI Form Suggestions (DEVE vir ANTES de router.use('/ai',...))
router.post('/ai/form-suggest', authenticate, async (req, res, next) => {
  try {
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { form_type, context, field, partial_text } = req.body;

    if (!field) return res.status(400).json({ success: false, message: 'Campo "field" obrigatório.' });

    const prompts = {
      project:    `És um assistente especializado em projectos de inovação e startups em Angola.\nGera conteúdo profissional para o campo "${field}".\nContexto: ${context || 'projecto de incubação'}\nTexto já escrito: ${partial_text || '(vazio)'}\n\nResponde APENAS com o texto sugerido para esse campo. Sem títulos, sem explicações, sem markdown. Em português de Angola.`,
      startup:    `És um assistente de negócios especializado em startups africanas.\nGera conteúdo para o campo "${field}" de uma startup angolana.\nContexto: ${context || ''}\nTexto já escrito: ${partial_text || '(vazio)'}\n\nResponde APENAS com o texto sugerido. Sem explicações. Em português.`,
      article:    `És um especialista em inovação e tecnologia em Angola.\nGera conteúdo para o campo "${field}" de um artigo/ideia.\nContexto: ${context || ''}\nTexto já escrito: ${partial_text || '(vazio)'}\n\nResponde APENAS com o texto sugerido. Sem explicações. Em português de Angola.`,
      submission: `És um assistente académico especializado em projectos de engenharia informática.\nGera conteúdo para o campo "${field}" de uma entrega de projecto.\nContexto: ${context || ''}\nTexto já escrito: ${partial_text || '(vazio)'}\n\nResponde APENAS com o texto sugerido. Sem explicações. Em português.`
    };

    const prompt = prompts[form_type] || prompts.project;
    const response = await ai.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });
    return res.json({ success: true, suggestion: response.content[0].text.trim() });
  } catch(e) {
    console.error('[form-suggest error]', e.message);
    return res.status(500).json({ success: false, message: 'Erro ao gerar sugestão: ' + (e.message || 'desconhecido') });
  }
});

// ── Rotas protegidas
router.use('/users',       authenticate, require('./user.routes'));
router.use('/startups',    authenticate, require('./startup.routes'));
router.use('/projects',    authenticate, require('./project.routes'));
router.use('/sandbox',     authenticate, require('./sandbox.routes'));
router.use('/articles',    authenticate, require('./article.routes'));
router.use('/submissions', require('./submission.routes'));

// ── Mentor
router.get('/mentor/my-projects', authenticate, async (req, res, next) => {
  try {
    const mentorService = require('../services/mentor.service');
    const data = await mentorService.getMentorProjects(req.user.id);
    return res.json({ success: true, data });
  } catch(e) { next(e); }
});
router.post('/mentor/assign/:projectId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const mentorService = require('../services/mentor.service');
    const data = await mentorService.manualAssign(req.params.projectId, req.body.mentor_id, req.user.id);
    return res.json({ success: true, data });
  } catch(e) { next(e); }
});

// ── Mensagens
router.get   ('/messages',           authenticate, adminCtrl.getMessages);
router.post  ('/messages',           authenticate, adminCtrl.sendMessage);
router.patch ('/messages/:id/read',  authenticate, adminCtrl.markMessageRead);

// ── Notificações
router.patch('/notifications/read-all', authenticate, async (req, res, next) => {
  try {
    const { Notification } = require('../models/sql/index');
    await Notification.update({ is_read: true }, { where: { user_id: req.user.id, is_read: false } });
    return res.json({ success: true, message: 'Todas marcadas como lidas.' });
  } catch(e) { next(e); }
});
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const { Notification } = require('../models/sql/index');
    const { page = 1, limit = 20, unread_only } = req.query;
    const where = { user_id: req.user.id };
    if (unread_only === 'true') where.is_read = false;
    const { count, rows } = await Notification.findAndCountAll({
      where, limit: +limit, offset: (+page - 1) * (+limit), order: [['created_at', 'DESC']]
    });
    return res.json({ success: true, data: rows, pagination: { total: count, page: +page, limit: +limit, pages: Math.ceil(count / (+limit)) } });
  } catch(e) { next(e); }
});
router.patch('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    const { Notification } = require('../models/sql/index');
    const n = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!n) return res.status(404).json({ success: false, message: 'Notificação não encontrada.' });
    await n.update({ is_read: true });
    return res.json({ success: true, data: n });
  } catch(e) { next(e); }
});

// ── AI & Admin (router.use('/ai',...) DEPOIS da rota específica /ai/form-suggest)
router.use('/ai',    authenticate, require('./ai.routes'));
router.use('/admin', authenticate, authorize('admin', 'mentor'), require('./admin.routes'));

// ── API info
router.get('/', (req, res) => res.json({
  name: 'INKU·AI Platform API', version: 'v1.0.0',
  institution: 'IP/UNIKIVI', fundecit: 'Edital Nº 1/2026'
}));

module.exports = router;

'use strict';
const router     = require('express').Router();
const { authenticate }  = require('../middleware/auth.middleware');
const { authorize }     = require('../middleware/role.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');
const adminCtrl  = require('../controllers/admin.controller');

// ── Auth (sem login)
router.use('/auth', rateLimitMiddleware.auth, require('./auth.routes'));

// ── Rotas protegidas por login
router.use('/users',    authenticate, require('./user.routes'));
router.use('/startups', authenticate, require('./startup.routes'));
router.use('/projects', authenticate, require('./project.routes'));
router.use('/sandbox',  authenticate, require('./sandbox.routes'));

// ── Mensagens — qualquer utilizador autenticado
router.get   ('/messages',              authenticate, adminCtrl.getMessages);
router.post  ('/messages',              authenticate, adminCtrl.sendMessage);
router.patch ('/messages/:id/read',     authenticate, adminCtrl.markMessageRead);

// ── Notificações — ORDEM IMPORTANTE: read-all ANTES de /:id/read
router.patch('/notifications/read-all', authenticate, async (req, res, next) => {
  try {
    const { Notification } = require('../models/sql/index');
    await Notification.update({ is_read:true }, { where:{ user_id:req.user.id, is_read:false } });
    return res.json({ success:true, message:'Todas marcadas como lidas.' });
  } catch(e){ next(e); }
});
router.get  ('/notifications',           authenticate, async (req, res, next) => {
  try {
    const { Notification } = require('../models/sql/index');
    const { page=1, limit=20, unread_only } = req.query;
    const where = { user_id: req.user.id };
    if (unread_only === 'true') where.is_read = false;
    const { count, rows } = await Notification.findAndCountAll({
      where, limit:+limit, offset:(+page-1)*(+limit),
      order:[['created_at','DESC']]
    });
    return res.json({ success:true, data:rows, pagination:{ total:count, page:+page, limit:+limit, pages:Math.ceil(count/(+limit)) } });
  } catch(e){ next(e); }
});
router.patch('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    const { Notification } = require('../models/sql/index');
    const n = await Notification.findOne({ where:{ id:req.params.id, user_id:req.user.id } });
    if (!n) return res.status(404).json({ success:false, message:'Notificação não encontrada.' });
    await n.update({ is_read:true });
    return res.json({ success:true, data:n });
  } catch(e){ next(e); }
});

// ── Admin (só admin e mentor)
router.use('/ai', authenticate, require('./ai.routes'));
router.use('/admin', authenticate, authorize('admin','mentor'), require('./admin.routes'));

// ── Mentor IA (cofundador de cada projecto)
router.post('/mentor-ai/:projectId/chat',    authenticate, async (req, res, next) => {
  try {
    const mentorAI = require('../services/mentor_ai.service');
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success:false, message:'Mensagem obrigatória.' });
    const result = await mentorAI.chat(req.params.projectId, message, req.user.id, history||[]);
    return res.json({ success:true, ...result });
  } catch(e) { next(e); }
});
router.post('/mentor-ai/:projectId/analyse', authenticate, async (req, res, next) => {
  try {
    const mentorAI = require('../services/mentor_ai.service');
    const result = await mentorAI.analyseProject(req.params.projectId);
    return res.json({ success:true, ...result });
  } catch(e) { next(e); }
});
router.post('/mentor-ai/submission/:id/evaluate', authenticate, async (req, res, next) => {
  try {
    const mentorAI = require('../services/mentor_ai.service');
    const result = await mentorAI.evaluateSubmission(req.params.id);
    return res.json({ success:true, ...result });
  } catch(e) { next(e); }
});

// ── API info
router.get('/', (req, res) => res.json({
  name:'INKU·AI Platform API', version:'v1.0.0',
  institution:'IP/UNIKIVI', fundecit:'Edital Nº 1/2026'
}));

module.exports = router;

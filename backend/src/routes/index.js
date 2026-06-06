'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');

router.use('/auth',      rateLimitMiddleware.auth, require('./auth.routes'));
router.use('/users',     authenticate, require('./user.routes'));
router.use('/startups',  authenticate, require('./startup.routes'));
router.use('/projects',  authenticate, require('./project.routes'));
router.use('/sandbox',   authenticate, require('./sandbox.routes'));
router.use('/admin',     authenticate, authorize('admin','mentor'), require('./admin.routes'));

router.get('/', (req, res) => res.json({
  name: 'INKU·AI Platform API', version: 'v1.0.0',
  institution: 'IP/UNIKIVI', fundecit: 'Edital Nº 1/2026'
}));
module.exports = router;
// Mensagens para utilizadores comuns (inbox/reply)
router.get('/messages',           authenticate, async(req,res,next)=>{
  try {
    const adminService = require('./admin.routes');
    next();
  } catch(e){ next(e); }
});

// ── Mensagens públicas (qualquer utilizador autenticado pode ver inbox/enviar resposta)
const adminCtrl = require('../controllers/admin.controller');
router.get('/messages',           authenticate, adminCtrl.getMessages);
router.post('/messages',          authenticate, adminCtrl.sendMessage);
router.patch('/messages/:id/read',authenticate, adminCtrl.markMessageRead);

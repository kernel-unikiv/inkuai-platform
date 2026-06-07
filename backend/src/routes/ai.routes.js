'use strict';
const router = require('express').Router();
const c      = require('../controllers/ai.controller');
const { authorize } = require('../middleware/role.middleware');

// ── Chat (todos os utilizadores autenticados)
router.post  ('/chat',                    c.chat);
router.get   ('/conversations',           c.getConversations);
router.get   ('/conversations/:id',       c.getConversation);
router.delete('/conversations/:id',       c.deleteConversation);

// ── Avaliação de projecto (admin, mentor, aprovadores)
router.post('/projects/:id/evaluate', authorize('admin','mentor'), c.evaluateProject);

// ── Acções pendentes e aprovação (só admin)
router.get  ('/actions',          authorize('admin'), c.getPendingActions);
router.patch('/actions/:id',      authorize('admin'), c.reviewAction);

// ── Monitorização e relatório (só admin)
router.post('/monitor',           authorize('admin'), c.runMonitoring);
router.get ('/report/pdf',        authorize('admin'), c.generateReport);

module.exports = router;

'use strict';
const router = require('express').Router();
const c      = require('../controllers/ai.controller');
const { authorize } = require('../middleware/role.middleware');

// ── Chat (todos os utilizadores autenticados)
router.post  ('/chat',              c.chat);
router.get   ('/conversations',     c.getConversations);
router.get   ('/conversations/:id', c.getConversation);
router.delete('/conversations/:id', c.deleteConversation);

// ── Avaliação de projecto (admin, mentor)
router.post('/projects/:id/evaluate', authorize('admin','mentor'), c.evaluateProject);

// ── Acções pendentes e aprovação (só admin)
router.get  ('/actions',     authorize('admin'), c.getPendingActions);
router.patch('/actions/:id', authorize('admin'), c.reviewAction);

// ── Monitorização e relatório PDF (só admin)
router.post('/monitor',      authorize('admin'), c.runMonitoring);
router.get ('/report/pdf',   authorize('admin'), c.generateReport);

// ── Health check — verificar GEMINI_API_KEY
router.get('/health', authorize('admin'), (req, res) => {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim();
  const ok  = key.length > 0;
  return res.json({
    success:      true,
    ai_provider:  'Google Gemini 1.5 Flash',
    configured:   ok,
    key_preview:  ok ? `${key.substring(0,12)}...${key.slice(-4)}` : 'NÃO CONFIGURADA',
    node_env:     process.env.NODE_ENV || 'unknown',
    message:      ok
      ? '✅ GEMINI_API_KEY configurada correctamente.'
      : '❌ GEMINI_API_KEY não encontrada. Obtenha gratuitamente em https://aistudio.google.com/apikey'
  });
});

module.exports = router;

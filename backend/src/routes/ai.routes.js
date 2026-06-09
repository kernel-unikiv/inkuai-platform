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

// ── Diagnóstico (admin) — verificar se API key está configurada
router.get('/health', authorize('admin'), (req, res) => {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  const configured = key.length > 0;
  const preview = configured ? `${key.substring(0,12)}...${key.slice(-4)}` : 'NÃO CONFIGURADA';
  return res.json({
    success: true,
    ai_configured: configured,
    key_preview: preview,
    node_env: process.env.NODE_ENV || 'unknown',
    env_keys_count: Object.keys(process.env).length,
    message: configured
      ? '✅ ANTHROPIC_API_KEY configurada correctamente.'
      : '❌ ANTHROPIC_API_KEY não encontrada. Adicione no Render → Environment.'
  });
});

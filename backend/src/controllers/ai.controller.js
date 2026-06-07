'use strict';
const aiService = require('../services/ai.service');
const { ApiResponse } = require('../utils/apiResponse');

class AIController {
  async chat(req, res, next) {
    try {
      const { message, conversation_id, context, context_id } = req.body;
      if (!message?.trim()) return res.status(400).json({ success:false, message:'Mensagem obrigatória.' });
      const result = await aiService.chat({
        userId: req.user.id, conversationId: conversation_id,
        message, context: context||'general', contextId: context_id||null
      });
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }

  async getConversations(req, res, next) {
    try {
      const { page=1, limit=20 } = req.query;
      const result = await aiService.getConversations(req.user.id, { page:+page, limit:+limit });
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }

  async getConversation(req, res, next) {
    try {
      const conv = await aiService.getConversation(req.params.id, req.user.id);
      return ApiResponse.success(res, conv);
    } catch(e) { next(e); }
  }

  async deleteConversation(req, res, next) {
    try {
      const r = await aiService.deleteConversation(req.params.id, req.user.id);
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }

  async getPendingActions(req, res, next) {
    try {
      const { page=1, limit=20, status='pending' } = req.query;
      const result = await aiService.getPendingActions({ page:+page, limit:+limit, status });
      return ApiResponse.paginated(res, result.actions, { total:result.total, page:+page, limit:+limit });
    } catch(e) { next(e); }
  }

  async reviewAction(req, res, next) {
    try {
      const { approved, note } = req.body;
      const result = await aiService.reviewAction(req.params.id, req.user.id, !!approved, note);
      return ApiResponse.success(res, { message: approved?'Acção executada!':'Acção rejeitada.', ...result });
    } catch(e) { next(e); }
  }

  async evaluateProject(req, res, next) {
    try {
      const result = await aiService.evaluateProject(req.params.id, req.user.id);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }

  async generateReport(req, res, next) {
    try {
      const pdfBuffer = await aiService.generatePlatformReport(req.user.id);
      const filename  = `INKUAI_Relatorio_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch(e) { next(e); }
  }

  async runMonitoring(req, res, next) {
    try {
      const result = await aiService.runMonitoring(req.user.id);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }
}

module.exports = new AIController();

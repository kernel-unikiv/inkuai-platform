'use strict';
const aiService = require('../services/ai.service');
const { ApiResponse } = require('../utils/apiResponse');

class AIController {

  // Rota unificada — roteia automaticamente por role
  async chat(req, res, next) {
    try {
      const { message, conversation_id, project_id, context } = req.body;
      if (!message?.trim()) return res.status(400).json({ success:false, message:'Mensagem obrigatória.' });
      const isAdmin = ['admin','mentor'].includes(req.user.role);
      let result;
      if (isAdmin && context === 'admin_platform') {
        result = await aiService.chatAdmin({ userId:req.user.id, conversationId:conversation_id, message });
      } else {
        result = await aiService.chatUser({ userId:req.user.id, conversationId:conversation_id, message, projectId:project_id });
      }
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
      return ApiResponse.success(res, { message: approved?'Acção executada!':'Rejeitada.', ...result });
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
      const pdf  = await aiService.generatePlatformReport(req.user.id);
      const name = `INKUAI_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`attachment; filename="${name}"`);
      res.setHeader('Content-Length', pdf.length);
      res.send(pdf);
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

'use strict';
const adminService = require('../services/admin.service');
const { ApiResponse } = require('../utils/apiResponse');

class AdminController {
  // ── Dashboard
  async getDashboard(req, res, next) {
    try { return ApiResponse.success(res, await adminService.getDashboard()); }
    catch(e) { next(e); }
  }

  // ── Utilizadores
  async getUsers(req, res, next) {
    try {
      const { page, limit, role, search, is_active } = req.query;
      const result = await adminService.getAllUsers({ page:+page||1, limit:+limit||20, role, search, is_active });
      return ApiResponse.paginated(res, result.users, { page:result.page, limit:result.limit, total:result.total });
    } catch(e) { next(e); }
  }
  async createUser(req, res, next) {
    try {
      const user = await adminService.createUser(req.body, req.user.id);
      return ApiResponse.success(res, { message:'Utilizador criado!', user }, 201);
    } catch(e) { next(e); }
  }
  async updateUser(req, res, next) {
    try {
      const user = await adminService.updateUser(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, { message:'Utilizador actualizado!', user });
    } catch(e) { next(e); }
  }
  async deleteUser(req, res, next) {
    try {
      const result = await adminService.deleteUser(req.params.id, req.user.id);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }
  async toggleUserActive(req, res, next) {
    try {
      const user = await adminService.toggleUserActive(req.params.id, req.user.id);
      return ApiResponse.success(res, { message:`Conta ${user.is_active?'activada':'suspensa'}`, user });
    } catch(e) { next(e); }
  }
  async setUserRole(req, res, next) {
    try {
      const user = await adminService.setUserRole(req.params.id, req.body.role, req.user.id);
      return ApiResponse.success(res, { message:`Role alterado para ${req.body.role}`, user });
    } catch(e) { next(e); }
  }

  // ── Projectos
  async getProjects(req, res, next) {
    try {
      const { page, limit, status, type, search } = req.query;
      const result = await adminService.getAllProjects({ page:+page||1, limit:+limit||20, status, type, search });
      return ApiResponse.paginated(res, result.projects, { page:result.page, limit:result.limit, total:result.total });
    } catch(e) { next(e); }
  }
  async updateProject(req, res, next) {
    try {
      const p = await adminService.updateProject(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, { message:'Projecto actualizado!', project: p });
    } catch(e) { next(e); }
  }
  async deleteProject(req, res, next) {
    try {
      const r = await adminService.deleteProject(req.params.id, req.user.id);
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async approveProject(req, res, next) {
    try {
      const p = await adminService.approveProject(req.params.id, req.user.id, req.body.note);
      return ApiResponse.success(res, { message:'Projecto aprovado!', project: p });
    } catch(e) { next(e); }
  }
  async rejectProject(req, res, next) {
    try {
      const p = await adminService.rejectProject(req.params.id, req.user.id, req.body.reason);
      return ApiResponse.success(res, { message:'Projecto rejeitado.', project: p });
    } catch(e) { next(e); }
  }
  async advanceProjectStage(req, res, next) {
    try {
      const p = await adminService.advanceProjectStage(req.params.id, req.user.id, req.body.status);
      return ApiResponse.success(res, { message:`Projecto avançou para "${req.body.status}"`, project: p });
    } catch(e) { next(e); }
  }
  async getProjectStats(req, res, next) {
    try {
      const stats = await adminService.getProjectStats(req.params.id, req.user.id);
      return ApiResponse.success(res, stats);
    } catch(e) { next(e); }
  }

  // ── Startups
  async getStartups(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await adminService.getAllStartups({ page:+page||1, limit:+limit||20, status, search });
      return ApiResponse.paginated(res, result.startups, { page:result.page, limit:result.limit, total:result.total });
    } catch(e) { next(e); }
  }
  async updateStartup(req, res, next) {
    try {
      const s = await adminService.updateStartup(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, { message:'Startup actualizada!', startup: s });
    } catch(e) { next(e); }
  }
  async deleteStartup(req, res, next) {
    try {
      const r = await adminService.deleteStartup(req.params.id, req.user.id);
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async advanceStartupStage(req, res, next) {
    try {
      const s = await adminService.advanceStartupStage(req.params.id, req.user.id, req.body.status);
      return ApiResponse.success(res, { message:`Startup avançou para "${req.body.status}"`, startup: s });
    } catch(e) { next(e); }
  }
  async getStartupStats(req, res, next) {
    try {
      const stats = await adminService.getStartupStats(req.params.id, req.user.id);
      return ApiResponse.success(res, stats);
    } catch(e) { next(e); }
  }

  // ── Mensagens
  async sendMessage(req, res, next) {
    try {
      const msg = await adminService.sendMessage(req.user.id, req.body);
      return ApiResponse.success(res, { message:'Mensagem enviada!', msg }, 201);
    } catch(e) { next(e); }
  }
  async sendBulkMessage(req, res, next) {
    try {
      const r = await adminService.sendBulkMessage(req.user.id, req.body);
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async getMessages(req, res, next) {
    try {
      const { page, limit, type } = req.query;
      const result = await adminService.getMessages(req.user.id, { page:+page||1, limit:+limit||20, type });
      return ApiResponse.paginated(res, result.messages, { page:result.page, limit:result.limit, total:result.total });
    } catch(e) { next(e); }
  }
  async markMessageRead(req, res, next) {
    try {
      await adminService.markMessageRead(req.params.id, req.user.id);
      return ApiResponse.success(res, { message:'Lida.' });
    } catch(e) { next(e); }
  }

  // ── Aprovadores
  async addApprover(req, res, next) {
    try {
      const r = await adminService.addApprover(req.user.id, req.body);
      return ApiResponse.success(res, { message:'Aprovador adicionado!', ...r }, 201);
    } catch(e) { next(e); }
  }
  async removeApprover(req, res, next) {
    try {
      const r = await adminService.removeApprover(req.user.id, req.params.id);
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async listApprovers(req, res, next) {
    try {
      const approvers = await adminService.listApprovers();
      return ApiResponse.success(res, { approvers });
    } catch(e) { next(e); }
  }

  // ── Estatísticas e Log
  async getPlatformStats(req, res, next) {
    try {
      const stats = await adminService.getPlatformStats();
      return ApiResponse.success(res, { stats });
    } catch(e) { next(e); }
  }
  async getAdminLog(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await adminService.getAdminLog({ page:+page||1, limit:+limit||30 });
      return ApiResponse.paginated(res, result.actions, { page:result.page, limit:result.limit, total:result.total });
    } catch(e) { next(e); }
  }
}

module.exports = new AdminController();

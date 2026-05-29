'use strict';
const startupService = require('../services/startup.service');
const { ApiResponse } = require('../utils/apiResponse');

class StartupController {
  async create(req, res, next) {
    try {
      const startup = await startupService.create(req.body, req.user.id);
      return ApiResponse.success(res, { message: 'Startup criada com sucesso!', startup }, 201);
    } catch (e) { next(e); }
  }

  async findAll(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await startupService.findAll({ page: +page||1, limit: +limit||10, status, search });
      return ApiResponse.paginated(res, result.startups, { page: result.page, limit: result.limit, total: result.total });
    } catch (e) { next(e); }
  }

  async findById(req, res, next) {
    try {
      const startup = await startupService.findById(req.params.id);
      return ApiResponse.success(res, { startup });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const startup = await startupService.update(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, { message: 'Startup actualizada!', startup });
    } catch (e) { next(e); }
  }

  async addMember(req, res, next) {
    try {
      const { userId, roleInTeam } = req.body;
      const member = await startupService.addMember(req.params.id, userId, roleInTeam, req.user.id);
      return ApiResponse.success(res, { message: 'Membro adicionado!', member }, 201);
    } catch (e) { next(e); }
  }

  async myStartups(req, res, next) {
    try {
      const startups = await startupService.getUserStartups(req.user.id);
      return ApiResponse.success(res, { startups });
    } catch (e) { next(e); }
  }
}

module.exports = new StartupController();

'use strict';
const sandboxService = require('../services/sandbox.service');
const { ApiResponse } = require('../utils/apiResponse');

class SandboxController {
  async execute(req, res, next) {
    try {
      const { code, project_id, type } = req.body;
      const result = await sandboxService.executeCode({ code, project_id, user_id: req.user.id, type });
      return ApiResponse.success(res, { message: 'Código executado', ...result });
    } catch (e) { next(e); }
  }

  async getHistory(req, res, next) {
    try {
      const { projectId } = req.params;
      const executions = await sandboxService.getHistory(projectId, +req.query.limit || 20);
      return ApiResponse.success(res, { executions });
    } catch (e) { next(e); }
  }

  async getExecution(req, res, next) {
    try {
      const execution = await sandboxService.getExecution(req.params.id);
      return ApiResponse.success(res, { execution });
    } catch (e) { next(e); }
  }
}

module.exports = new SandboxController();

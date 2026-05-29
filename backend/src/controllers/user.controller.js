'use strict';
const userService = require('../services/user.service');
const { ApiResponse } = require('../utils/apiResponse');

class UserController {
  async findAll(req, res, next) {
    try {
      const { page, limit, role, search } = req.query;
      const result = await userService.findAll({ page: +page||1, limit: +limit||10, role, search });
      return ApiResponse.paginated(res, result.users, { page: result.page, limit: result.limit, total: result.total });
    } catch (e) { next(e); }
  }

  async findById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      return ApiResponse.success(res, { user });
    } catch (e) { next(e); }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.params.id, req.body, req.user.id, req.user.role);
      return ApiResponse.success(res, { message: 'Perfil actualizado!', user });
    } catch (e) { next(e); }
  }

  async getDashboardStats(req, res, next) {
    try {
      const stats = await userService.getDashboardStats(req.user.id);
      return ApiResponse.success(res, { stats });
    } catch (e) { next(e); }
  }

  async getNotifications(req, res, next) {
    try {
      const notifications = await userService.getNotifications(req.user.id);
      return ApiResponse.success(res, { notifications });
    } catch (e) { next(e); }
  }

  async markNotificationRead(req, res, next) {
    try {
      await userService.markNotificationRead(req.params.notifId, req.user.id);
      return ApiResponse.success(res, { message: 'Notificação marcada como lida.' });
    } catch (e) { next(e); }
  }
}

module.exports = new UserController();

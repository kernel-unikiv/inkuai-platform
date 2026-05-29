'use strict';
const { User, Project, Startup } = require('../models/sql/index');
const { ApiResponse } = require('../utils/apiResponse');

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const [users, projects, startups] = await Promise.all([
        User.count(), Project.count(), Startup.count()
      ]);
      const recentUsers = await User.findAll({ order: [['created_at','DESC']], limit: 5 });
      const recentProjects = await Project.findAll({ order: [['created_at','DESC']], limit: 5 });
      return ApiResponse.success(res, {
        stats: { users, projects, startups },
        recentUsers: recentUsers.map(u => u.toPublicJSON()),
        recentProjects
      });
    } catch (e) { next(e); }
  }

  async setUserRole(req, res, next) {
    try {
      const { role } = req.body;
      const user = await User.findByPk(req.params.id);
      if (!user) return ApiResponse.error(res, 'Utilizador não encontrado.', 404);
      await user.update({ role });
      return ApiResponse.success(res, { message: `Role actualizado para ${role}`, user: user.toPublicJSON() });
    } catch (e) { next(e); }
  }

  async toggleUserActive(req, res, next) {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return ApiResponse.error(res, 'Utilizador não encontrado.', 404);
      await user.update({ is_active: !user.is_active });
      return ApiResponse.success(res, { message: `Conta ${user.is_active ? 'activada' : 'desactivada'}`, user: user.toPublicJSON() });
    } catch (e) { next(e); }
  }
}

module.exports = new AdminController();

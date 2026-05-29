'use strict';
const { User, Startup, Project, TeamMember, Notification } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { Op } = require('sequelize');

class UserService {
  async findAll({ page=1, limit=10, role, search }) {
    const where = {};
    if (role) where.role = role;
    if (search) where.name = { [Op.like]: `%${search}%` };
    const { count, rows } = await User.findAndCountAll({
      where, limit, offset:(page-1)*limit, order:[['created_at','DESC']]
    });
    return { users: rows.map(u => u.toPublicJSON()), total:count, page, limit };
  }

  async findById(id) {
    const user = await User.findByPk(id);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    return user.toPublicJSON();
  }

  async updateProfile(id, data, requesterId, requesterRole) {
    if (id !== requesterId && requesterRole !== 'admin')
      throw new AppError('Sem permissão.', 403);
    const user = await User.findByPk(id);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    const allowed = ['name','bio','github_username','orcid_id','institution','avatar_url'];
    const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    return (await user.update(filtered)).toPublicJSON();
  }

  async getDashboardStats(userId) {
    const [startups, projects, notifications] = await Promise.all([
      TeamMember.count({ where:{ user_id:userId, is_active:true } }),
      Project.count({ where:{ created_by:userId } }),
      Notification.count({ where:{ user_id:userId, is_read:false } })
    ]);
    return { startups, projects, notifications };
  }

  async getNotifications(userId, limit=20) {
    return Notification.findAll({
      where:{ user_id:userId }, order:[['created_at','DESC']], limit
    });
  }

  async markNotificationRead(notifId, userId) {
    const notif = await Notification.findByPk(notifId);
    if (!notif) throw new AppError('Notificação não encontrada.', 404);
    if (notif.user_id !== userId) throw new AppError('Sem permissão.', 403);
    return notif.update({ is_read:true });
  }

  async createNotification({ user_id, title, message, type='info', action_url }) {
    return Notification.create({ user_id, title, message, type, action_url });
  }
}

module.exports = new UserService();

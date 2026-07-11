'use strict';
const { User, Startup, Project, TeamMember, Notification } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { Op } = require('sequelize');

// Fields allowed to be updated by the user themselves
const PROFILE_FIELDS = [
  'name', 'bio', 'github_username', 'orcid_id', 'institution',
  'avatar_url', 'linkedin_url', 'website_url', 'portfolio_url',
  'location', 'skills_json', 'mentor_bio', 'expertise_areas'
];

class UserService {
  async findAll({ page=1, limit=10, role, search }) {
    const where = { is_active: true };
    if (role)   where.role = role;
    if (search) where[Op.or] = [
      { name:  { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
    const { count, rows } = await User.findAndCountAll({
      where, limit: +limit, offset: (+page-1)*(+limit),
      order: [['created_at','DESC']]
    });
    return { users: rows.map(u => this._public(u)), total: count, page: +page, limit: +limit };
  }

  async findById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    return this._public(user);
  }

  async updateProfile(id, data, requesterId, requesterRole) {
    if (id !== requesterId && requesterRole !== 'admin')
      throw new AppError('Sem permissão para editar este perfil.', 403);
    const user = await User.findByPk(id);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => PROFILE_FIELDS.includes(k))
    );
    const updated = await user.update(filtered);
    return this._public(updated);
  }

  async getDashboardStats(userId) {
    const [startups, projects, notifications] = await Promise.all([
      TeamMember.count({ where: { user_id: userId, is_active: true } }),
      Project.count({ where: { created_by: userId } }),
      Notification.count({ where: { user_id: userId, is_read: false } })
    ]);
    return { startups, projects, notifications };
  }

  async getNotifications(userId, limit=20) {
    return Notification.findAll({
      where: { user_id: userId },
      order: [['created_at','DESC']], limit
    });
  }

  async markNotificationRead(notifId, userId) {
    const notif = await Notification.findByPk(notifId);
    if (!notif) throw new AppError('Notificação não encontrada.', 404);
    if (notif.user_id !== userId) throw new AppError('Sem permissão.', 403);
    return notif.update({ is_read: true });
  }

  async createNotification({ user_id, title, message, type='info', action_url }) {
    return Notification.create({ user_id, title, message, type, action_url });
  }

  _public(u) {
    const j = u.toJSON ? u.toJSON() : { ...u };
    delete j.password_hash;
    return j;
  }
}

module.exports = new UserService();

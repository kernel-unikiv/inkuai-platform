'use strict';
const { Startup, TeamMember, User } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { Op } = require('sequelize');

class StartupService {
  async create({ name, description, sector, github_url, website_url, tags }, ownerId) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,80)
      + '-' + Date.now().toString(36);
    const startup = await Startup.create({ name, slug, description, sector,
      github_url, website_url, tags_json: JSON.stringify(tags||[]), owner_id: ownerId });
    await TeamMember.create({ startup_id: startup.id, user_id: ownerId, role_in_team: 'lead' });
    return { ...startup.toJSON(), tags: tags||[] };
  }

  async findAll({ page=1, limit=10, status, search }) {
    const where = {};
    if (status) where.status = status;
    if (search) where.name = { [Op.like]: `%${search}%` };
    const { count, rows } = await Startup.findAndCountAll({
      where, limit, offset: (page-1)*limit,
      include: [{ model: User, as:'owner', attributes:['id','name','avatar_url'] }],
      order: [['created_at','DESC']]
    });
    return { startups: rows.map(s => ({...s.toJSON(), tags: this._parseTags(s.tags_json)})), total:count, page, limit };
  }

  async findById(id) {
    const startup = await Startup.findByPk(id, {
      include: [
        { model: User, as:'owner', attributes:['id','name','email','avatar_url'] },
        { model: TeamMember, as:'members',
          include: [{ model: User, as:'user', attributes:['id','name','avatar_url','role'] }] }
      ]
    });
    if (!startup) throw new AppError('Startup não encontrada.', 404);
    return { ...startup.toJSON(), tags: this._parseTags(startup.tags_json) };
  }

  async update(id, data, userId) {
    const startup = await Startup.findByPk(id);
    if (!startup) throw new AppError('Startup não encontrada.', 404);
    if (startup.owner_id !== userId) throw new AppError('Sem permissão.', 403);
    if (data.tags) data.tags_json = JSON.stringify(data.tags);
    return startup.update(data);
  }

  async addMember(startupId, targetUserId, roleInTeam, requesterId) {
    const startup = await Startup.findByPk(startupId);
    if (!startup) throw new AppError('Startup não encontrada.', 404);
    if (startup.owner_id !== requesterId) throw new AppError('Sem permissão.', 403);
    const exists = await TeamMember.findOne({ where: { startup_id:startupId, user_id:targetUserId }});
    if (exists) throw new AppError('Utilizador já é membro.', 409);
    return TeamMember.create({ startup_id:startupId, user_id:targetUserId, role_in_team:roleInTeam });
  }

  async getUserStartups(userId) {
    const memberships = await TeamMember.findAll({ where: { user_id:userId, is_active:true }});
    const ids = memberships.map(m => m.startup_id);
    if (!ids.length) return [];
    const startups = await Startup.findAll({ where: { id: ids }, order:[['created_at','DESC']] });
    return startups.map(s => ({...s.toJSON(), tags: this._parseTags(s.tags_json)}));
  }

  _parseTags(json) { try { return JSON.parse(json||'[]'); } catch { return []; } }
}

module.exports = new StartupService();

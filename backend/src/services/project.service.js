'use strict';
const { Project, User, Startup, Evaluation } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { Op } = require('sequelize');

class ProjectService {
  async create(data, userId) {
    const payload = { ...data, created_by: userId };
    if (data.tech_stack) { payload.tech_stack_json = JSON.stringify(data.tech_stack); delete payload.tech_stack; }
    if (data.tags)       { payload.tags_json = JSON.stringify(data.tags); delete payload.tags; }
    const project = await Project.create(payload);

    // ── Atribuição automática de mentor por área (não bloqueia a criação) ──
    try {
      const mentorService = require('./mentor.service');
      await mentorService.autoAssignMentor(project.id);
    } catch (err) {
      // Não falhar a criação do projecto se não houver mentores disponíveis
      console.warn('⚠️  Não foi possível atribuir mentor automaticamente:', err.message);
    }

    return { ...project.toJSON(), tech_stack: data.tech_stack||[], tags: data.tags||[] };
  }

  async findAll({ page=1, limit=10, status, type, search, userId }) {
    const where = {};
    if (status) where.status = status;
    if (type)   where.type = type;
    if (userId) where.created_by = userId;
    if (search) where.title = { [Op.like]: `%${search}%` };
    const { count, rows } = await Project.findAndCountAll({
      where, limit, offset:(page-1)*limit,
      include: [
        { model: User, as:'creator', attributes:['id','name','avatar_url'] },
        { model: Startup, as:'startup', attributes:['id','name'] }
      ],
      order:[['created_at','DESC']]
    });
    return { projects: rows.map(p => this._format(p)), total:count, page, limit };
  }

  async findById(id) {
    const project = await Project.findByPk(id, {
      include: [
        { model: User, as:'creator', attributes:['id','name','email','avatar_url'] },
        { model: Startup, as:'startup' },
        { model: Evaluation, as:'evaluations',
          include:[{ model: User, as:'evaluator', attributes:['id','name'] }] }
      ]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    return this._format(project);
  }

  async update(id, data, userId, userRole) {
    const project = await Project.findByPk(id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (project.created_by !== userId && !['admin','mentor'].includes(userRole))
      throw new AppError('Sem permissão.', 403);
    if (data.tech_stack) { data.tech_stack_json = JSON.stringify(data.tech_stack); delete data.tech_stack; }
    if (data.tags)       { data.tags_json = JSON.stringify(data.tags); delete data.tags; }
    return project.update(data);
  }

  async submit(id, userId) {
    const project = await Project.findByPk(id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (project.created_by !== userId) throw new AppError('Sem permissão.', 403);
    if (project.status !== 'draft') throw new AppError('Apenas rascunhos podem ser submetidos.', 400);
    return project.update({ status:'submitted' });
  }

  async approve(id) {
    const project = await Project.findByPk(id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    return project.update({ status:'approved' });
  }

  async getStats() {
    const [total, approved, completed, submitted] = await Promise.all([
      Project.count(),
      Project.count({ where:{ status:'approved' }}),
      Project.count({ where:{ status:'completed' }}),
      Project.count({ where:{ status:'submitted' }}),
    ]);
    return { total, active: approved, completed, pending: submitted };
  }

  _format(p) {
    const j = p.toJSON();
    j.tech_stack = (() => { try { return JSON.parse(p.tech_stack_json||'[]'); } catch { return []; } })();
    j.tags       = (() => { try { return JSON.parse(p.tags_json||'[]'); } catch { return []; } })();
    return j;
  }
}

module.exports = new ProjectService();

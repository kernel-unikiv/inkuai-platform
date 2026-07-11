'use strict';
const { Project, User, Startup, Evaluation } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { Op, fn, col, literal } = require('sequelize');

class ProjectService {
  async create(data, userId) {
    const payload = { ...data, created_by: userId };
    if (data.tech_stack) { payload.tech_stack_json = JSON.stringify(data.tech_stack); delete payload.tech_stack; }
    if (data.tags)       { payload.tags_json = JSON.stringify(data.tags); delete payload.tags; }
    if (data.gallery)    { payload.gallery_json = JSON.stringify(data.gallery); delete payload.gallery; }
    const project = await Project.create(payload);
    return this._format(project);
  }

  async findAll({ page=1, limit=10, status, type, search, userId, createdBy }) {
    const where = {};
    if (status) where.status = status;
    if (type)   where.type = type;
    if (userId || createdBy) where.created_by = userId || createdBy;
    if (search) where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
    const { count, rows } = await Project.findAndCountAll({
      where, limit: +limit, offset: (+page-1)*(+limit),
      include: [
        { model: User,    as: 'creator', attributes: ['id','name','avatar_url','institution'] },
        { model: Startup, as: 'startup', attributes: ['id','name'], required: false }
      ],
      order: [['created_at','DESC']]
    });
    return { projects: rows.map(p => this._format(p)), total: count, page: +page, limit: +limit };
  }

  async findById(id) {
    const project = await Project.findByPk(id, {
      include: [
        { model: User,    as: 'creator', attributes: ['id','name','email','avatar_url','bio','institution','github_username'] },
        { model: Startup, as: 'startup', required: false },
        { model: Evaluation, as: 'evaluations',
          include: [{ model: User, as: 'evaluator', attributes: ['id','name','avatar_url','role'] }],
          order: [['created_at','DESC']]
        }
      ]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    // Increment views
    await project.increment('views').catch(() => {});
    return this._format(project);
  }

  async update(id, data, userId, userRole) {
    const project = await Project.findByPk(id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (project.created_by !== userId && !['admin','mentor'].includes(userRole))
      throw new AppError('Sem permissão.', 403);
    if (data.tech_stack) { data.tech_stack_json = JSON.stringify(data.tech_stack); delete data.tech_stack; }
    if (data.tags)       { data.tags_json = JSON.stringify(data.tags); delete data.tags; }
    if (data.gallery)    { data.gallery_json = JSON.stringify(data.gallery); delete data.gallery; }
    return this._format(await project.update(data));
  }

  async submit(id, userId) {
    const project = await Project.findByPk(id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (project.created_by !== userId) throw new AppError('Sem permissão.', 403);
    if (project.status !== 'draft') throw new AppError('Apenas rascunhos podem ser submetidos.', 400);
    return this._format(await project.update({ status: 'submitted' }));
  }

  async approve(id) {
    const project = await Project.findByPk(id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    return this._format(await project.update({ status: 'approved' }));
  }

  // ── Star Rating System
  async rateProject(projectId, evaluatorId, { stars, feedback, innovation_score, viability_score, impact_score, presentation_score }) {
    if (stars < 1 || stars > 5) throw new AppError('Classificação deve ser entre 1 e 5 estrelas.', 400);
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (project.created_by === evaluatorId) throw new AppError('Não pode avaliar o seu próprio projecto.', 400);

    // Upsert — cada utilizador avalia uma vez, pode editar
    const [evaluation, created] = await Evaluation.findOrCreate({
      where: { project_id: projectId, evaluator_id: evaluatorId },
      defaults: { stars, feedback, innovation_score: innovation_score||0, viability_score: viability_score||0, impact_score: impact_score||0, presentation_score: presentation_score||0, status: 'submitted' }
    });
    if (!created) {
      await evaluation.update({ stars, feedback, innovation_score: innovation_score||0, viability_score: viability_score||0, impact_score: impact_score||0, presentation_score: presentation_score||0 });
    }

    // Recalculate project avg_stars
    const allEvals = await Evaluation.findAll({ where: { project_id: projectId } });
    const avg = allEvals.reduce((s, e) => s + (e.stars||0), 0) / allEvals.length;
    await project.update({ avg_stars: Math.round(avg * 10) / 10, eval_count: allEvals.length });

    return { evaluation, avg_stars: Math.round(avg * 10) / 10, eval_count: allEvals.length, created };
  }

  async getProjectEvaluations(projectId, { sort = 'recent' } = {}) {
    const order = sort === 'best' ? [['stars','DESC']] : sort === 'worst' ? [['stars','ASC']] : [['created_at','DESC']];
    return Evaluation.findAll({
      where: { project_id: projectId },
      include: [{ model: User, as: 'evaluator', attributes: ['id','name','avatar_url','role'] }],
      order
    });
  }

  async getUserEvaluation(projectId, userId) {
    return Evaluation.findOne({ where: { project_id: projectId, evaluator_id: userId } });
  }

  async likeProject(projectId, userId) {
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    await project.increment('likes');
    return { likes: project.likes + 1 };
  }

  async getStats() {
    const [total, approved, completed, submitted] = await Promise.all([
      Project.count(),
      Project.count({ where: { status: 'approved' } }),
      Project.count({ where: { status: 'completed' } }),
      Project.count({ where: { status: 'submitted' } }),
    ]);
    return { total, active: approved, completed, pending: submitted };
  }

  _format(p) {
    if (!p) return null;
    const j = p.toJSON ? p.toJSON() : { ...p };
    j.tech_stack = (() => { try { return JSON.parse(p.tech_stack_json||'[]'); } catch { return []; } })();
    j.tags       = (() => { try { return JSON.parse(p.tags_json||'[]'); } catch { return []; } })();
    j.gallery    = (() => { try { return JSON.parse(p.gallery_json||'[]'); } catch { return []; } })();
    return j;
  }
}

module.exports = new ProjectService();

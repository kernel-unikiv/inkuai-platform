'use strict';
const { Article, User, Project } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { Op } = require('sequelize');

class ArticleService {
  async create(data, userId) {
    const article = await Article.create({ ...data, author_id: userId });
    return this._format(await Article.findByPk(article.id, {
      include: [{ model: User, as: 'author', attributes: ['id','name','avatar_url','role'] }]
    }));
  }

  async findAll({ page=1, limit=10, category, search, authorId }) {
    const where = { status: 'published' };
    if (category) where.category = category;
    if (authorId) where.author_id = authorId;
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { summary: { [Op.like]: `%${search}%` } }
    ];
    const { count, rows } = await Article.findAndCountAll({
      where, limit, offset: (page-1)*limit,
      include: [
        { model: User, as: 'author', attributes: ['id','name','avatar_url','role'] },
        { model: Project, as: 'project', attributes: ['id','title','type'], required: false }
      ],
      order: [['created_at','DESC']]
    });
    return { articles: rows.map(a => this._format(a)), total: count, page, limit };
  }

  async findById(id) {
    const a = await Article.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id','name','avatar_url','role','institution'] },
        { model: Project, as: 'project', attributes: ['id','title','type','status'], required: false }
      ]
    });
    if (!a) throw new AppError('Artigo não encontrado.', 404);
    await a.increment('views');
    return this._format(a);
  }

  async update(id, data, userId, role) {
    const a = await Article.findByPk(id);
    if (!a) throw new AppError('Artigo não encontrado.', 404);
    if (a.author_id !== userId && !['admin'].includes(role)) throw new AppError('Sem permissão.', 403);
    if (data.tags) { data.tags_json = JSON.stringify(data.tags); delete data.tags; }
    return a.update(data);
  }

  async delete(id, userId, role) {
    const a = await Article.findByPk(id);
    if (!a) throw new AppError('Artigo não encontrado.', 404);
    if (a.author_id !== userId && role !== 'admin') throw new AppError('Sem permissão.', 403);
    await a.update({ status: 'deleted' });
    return { deleted: true };
  }

  async like(id) {
    const a = await Article.findByPk(id);
    if (!a) throw new AppError('Artigo não encontrado.', 404);
    await a.increment('likes');
    return { likes: a.likes + 1 };
  }

  _format(a) {
    const j = a.toJSON();
    j.tags = (() => { try { return JSON.parse(a.tags_json||'[]'); } catch { return []; } })();
    return j;
  }
}

module.exports = new ArticleService();

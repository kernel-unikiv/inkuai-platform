'use strict';
const { Op } = require('sequelize');
const { Article, User, Project, Notification, AdminAction } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');

class ArticleService {

  async create(data, authorId) {
    const article = await Article.create({
      author_id:  authorId,
      title:      data.title,
      summary:    data.summary || '',
      body:       data.body,
      type:       data.type || 'article',
      tags:       JSON.stringify(data.tags || []),
      project_id: data.project_id || null,
      status:     data.status || 'draft'
    });
    return article;
  }

  async list({ page=1, limit=20, type, status='published', search }) {
    const where = { status };
    if (type) where.type = type;
    if (search) where.title = { [Op.like]: `%${search}%` };
    const { count, rows } = await Article.findAndCountAll({
      where, limit, offset:(page-1)*limit,
      include: [
        { model: User, as:'author', attributes:['id','name','role'] },
        { model: Project, as:'project', attributes:['id','title'] }
      ],
      order: [['created_at','DESC']]
    });
    return { articles: rows, total: count };
  }

  async getById(id) {
    const article = await Article.findByPk(id, {
      include: [
        { model: User, as:'author', attributes:['id','name','role','bio'] },
        { model: Project, as:'project', attributes:['id','title'] }
      ]
    });
    if (!article) throw new AppError('Artigo não encontrado.', 404);
    await article.increment('views');
    return article;
  }

  async update(id, data, userId) {
    const article = await Article.findByPk(id);
    if (!article) throw new AppError('Artigo não encontrado.', 404);
    if (article.author_id !== userId) throw new AppError('Sem permissão.', 403);
    const allowed = ['title','summary','body','tags','status'];
    const filtered = Object.fromEntries(Object.entries(data).filter(([k])=>allowed.includes(k)));
    if (filtered.tags) filtered.tags = JSON.stringify(filtered.tags);
    await article.update(filtered);
    return article;
  }

  async delete(id, userId, isAdmin) {
    const article = await Article.findByPk(id);
    if (!article) throw new AppError('Artigo não encontrado.', 404);
    if (article.author_id !== userId && !isAdmin) throw new AppError('Sem permissão.', 403);
    await article.destroy();
    return { deleted: true };
  }

  async like(id) {
    const article = await Article.findByPk(id);
    if (!article) throw new AppError('Artigo não encontrado.', 404);
    await article.increment('likes');
    return article;
  }

  async feature(id, adminId) {
    const article = await Article.findByPk(id);
    if (!article) throw new AppError('Artigo não encontrado.', 404);
    await article.update({ status:'featured' });
    await AdminAction.create({ admin_id:adminId, action:'feature_article', target_type:'article', target_id:id });
    await Notification.create({
      user_id: article.author_id, type:'success',
      title: '⭐ O seu artigo foi destacado!',
      message: `"${article.title}" foi destacado pela administração.`,
      action_url: `/articles.html?id=${id}`
    });
    return article;
  }
}

module.exports = new ArticleService();

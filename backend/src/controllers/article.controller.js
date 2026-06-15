'use strict';
const articleService = require('../services/article.service');
const { ApiResponse } = require('../utils/apiResponse');

class ArticleController {
  async create(req, res, next) {
    try {
      const article = await articleService.create(req.body, req.user.id);
      return ApiResponse.success(res, { message: 'Artigo publicado!', article }, 201);
    } catch(e) { next(e); }
  }
  async findAll(req, res, next) {
    try {
      const { page, limit, category, search, authorId } = req.query;
      const result = await articleService.findAll({ page:+page||1, limit:+limit||12, category, search, authorId });
      return ApiResponse.paginated(res, result.articles, { page:result.page, limit:result.limit, total:result.total });
    } catch(e) { next(e); }
  }
  async findById(req, res, next) {
    try {
      const article = await articleService.findById(req.params.id);
      return ApiResponse.success(res, { article });
    } catch(e) { next(e); }
  }
  async update(req, res, next) {
    try {
      const article = await articleService.update(req.params.id, req.body, req.user.id, req.user.role);
      return ApiResponse.success(res, { message: 'Artigo actualizado!', article });
    } catch(e) { next(e); }
  }
  async delete(req, res, next) {
    try {
      const result = await articleService.delete(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }
  async like(req, res, next) {
    try {
      const result = await articleService.like(req.params.id);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }
}
module.exports = new ArticleController();

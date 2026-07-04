'use strict';
const articleService = require('../services/article.service');
const { ApiResponse } = require('../utils/apiResponse');

class ArticleController {
  async create(req, res, next) {
    try {
      const a = await articleService.create(req.body, req.user.id);
      return ApiResponse.success(res, { message:'Artigo criado!', article:a }, 201);
    } catch(e) { next(e); }
  }
  async list(req, res, next) {
    try {
      const { page=1, limit=20, type, status, search } = req.query;
      const r = await articleService.list({ page:+page, limit:+limit, type, status, search });
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async getOne(req, res, next) {
    try {
      const a = await articleService.getById(req.params.id);
      return ApiResponse.success(res, { article:a });
    } catch(e) { next(e); }
  }
  async update(req, res, next) {
    try {
      const a = await articleService.update(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, { message:'Actualizado!', article:a });
    } catch(e) { next(e); }
  }
  async remove(req, res, next) {
    try {
      const r = await articleService.delete(req.params.id, req.user.id, req.user.role==='admin');
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async like(req, res, next) {
    try {
      const a = await articleService.like(req.params.id);
      return ApiResponse.success(res, { article:a });
    } catch(e) { next(e); }
  }
  async feature(req, res, next) {
    try {
      const a = await articleService.feature(req.params.id, req.user.id);
      return ApiResponse.success(res, { message:'Destacado!', article:a });
    } catch(e) { next(e); }
  }
}
module.exports = new ArticleController();

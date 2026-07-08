'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const socialService = require('../services/social.service');
const roadmapService = require('../services/roadmap.service');
const { ApiResponse } = require('../utils/apiResponse');
const { MediaLibrary } = require('../models/sql/index');

router.use(authenticate);

// ── COMENTÁRIOS
router.get('/comments/:type/:id',   async (req, res, next) => {
  try {
    const data = await socialService.getComments(req.params.type, req.params.id);
    return ApiResponse.success(res, { comments: data });
  } catch(e) { next(e); }
});
router.post('/comments',            async (req, res, next) => {
  try {
    const { targetType, targetId, body, parentId } = req.body;
    const c = await socialService.addComment({ authorId: req.user.id, targetType, targetId, body, parentId });
    return ApiResponse.success(res, { comment: c }, 201);
  } catch(e) { next(e); }
});
router.post('/comments/:id/like',   async (req, res, next) => {
  try {
    const r = await socialService.likeComment(req.params.id, req.user.id);
    return ApiResponse.success(res, r);
  } catch(e) { next(e); }
});
router.delete('/comments/:id',      async (req, res, next) => {
  try {
    const r = await socialService.deleteComment(req.params.id, req.user.id, req.user.role);
    return ApiResponse.success(res, r);
  } catch(e) { next(e); }
});

// ── FOLLOWS
router.post('/follow',              async (req, res, next) => {
  try {
    const { targetType, targetId } = req.body;
    const r = await socialService.follow(req.user.id, targetType || 'user', targetId);
    return ApiResponse.success(res, r);
  } catch(e) { next(e); }
});
router.get('/followers/:type/:id',  async (req, res, next) => {
  try {
    const r = await socialService.getFollowers(req.params.type, req.params.id);
    return ApiResponse.success(res, { followers: r });
  } catch(e) { next(e); }
});
router.get('/following',            async (req, res, next) => {
  try {
    const r = await socialService.getFollowing(req.user.id);
    return ApiResponse.success(res, { following: r });
  } catch(e) { next(e); }
});
router.get('/follow/check',         async (req, res, next) => {
  try {
    const { targetType, targetId } = req.query;
    const r = await socialService.isFollowing(req.user.id, targetType || 'user', targetId);
    return ApiResponse.success(res, { following: r });
  } catch(e) { next(e); }
});

// ── REPUTAÇÃO
router.get('/reputation/:userId',   async (req, res, next) => {
  try {
    const r = await socialService.getReputation(req.params.userId);
    return ApiResponse.success(res, { reputation: r });
  } catch(e) { next(e); }
});
router.get('/reputation',           async (req, res, next) => {
  try {
    const r = await socialService.getReputation(req.user.id);
    return ApiResponse.success(res, { reputation: r });
  } catch(e) { next(e); }
});

// ── ROADMAP
router.get('/roadmap/:projectId',          async (req, res, next) => {
  try {
    const r = await roadmapService.getProjectRoadmap(req.params.projectId);
    return ApiResponse.success(res, { roadmap: r });
  } catch(e) { next(e); }
});
router.post('/roadmap/:projectId/generate', async (req, res, next) => {
  try {
    const r = await roadmapService.generateAIRoadmap(req.params.projectId, req.user.id);
    return ApiResponse.success(res, { roadmap: r, message: 'Roadmap gerado pela IA!' });
  } catch(e) { next(e); }
});
router.post('/roadmap/:projectId',         async (req, res, next) => {
  try {
    const r = await roadmapService.createPhase(req.params.projectId, req.body, req.user.id);
    return ApiResponse.success(res, { phase: r }, 201);
  } catch(e) { next(e); }
});
router.put('/roadmap/phase/:id',           async (req, res, next) => {
  try {
    const r = await roadmapService.updatePhase(req.params.id, req.body, req.user.id);
    return ApiResponse.success(res, { phase: r });
  } catch(e) { next(e); }
});
router.delete('/roadmap/phase/:id',        async (req, res, next) => {
  try {
    const r = await roadmapService.deletePhase(req.params.id, req.user.id);
    return ApiResponse.success(res, r);
  } catch(e) { next(e); }
});

// ── BIBLIOTECA MULTIMÉDIA
router.get('/media',                       async (req, res, next) => {
  try {
    const { projectId, type } = req.query;
    const where = { owner_id: req.user.id };
    if (projectId) where.project_id = projectId;
    if (type) where.type = type;
    const items = await MediaLibrary.findAll({ where, order:[['created_at','DESC']], limit: 100 });
    return ApiResponse.success(res, { media: items });
  } catch(e) { next(e); }
});
router.post('/media',                      async (req, res, next) => {
  try {
    const { name, type, url, projectId, description, tags, isPublic } = req.body;
    const item = await MediaLibrary.create({
      owner_id: req.user.id, project_id: projectId || null,
      name, type: type || 'file', url, description,
      tags_json: JSON.stringify(tags || []),
      is_public: isPublic || false
    });
    return ApiResponse.success(res, { item }, 201);
  } catch(e) { next(e); }
});
router.delete('/media/:id',               async (req, res, next) => {
  try {
    const item = await MediaLibrary.findByPk(req.params.id);
    if (!item || (item.owner_id !== req.user.id && req.user.role !== 'admin'))
      throw { status: 403, message: 'Sem permissão.' };
    await item.destroy();
    return ApiResponse.success(res, { deleted: true });
  } catch(e) { next(e); }
});

module.exports = router;

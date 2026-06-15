'use strict';
const projectService = require('../services/project.service');
const mentorService  = require('../services/mentor.service');
const { ApiResponse } = require('../utils/apiResponse');

class ProjectController {
  async create(req, res, next) {
    try {
      const project = await projectService.create(req.body, req.user.id);
      // Auto-assign mentor after creation (non-blocking)
      mentorService.autoAssign(project.id).catch(e => console.warn('[MentorAssign]', e.message));
      return ApiResponse.success(res, { message: 'Projecto criado! Mentor a ser atribuído automaticamente.', project }, 201);
    } catch (e) { next(e); }
  }

  async findAll(req, res, next) {
    try {
      const { page, limit, status, type, search } = req.query;
      const result = await projectService.findAll({ page: +page||1, limit: +limit||10, status, type, search });
      return ApiResponse.paginated(res, result.projects, { page: result.page, limit: result.limit, total: result.total });
    } catch (e) { next(e); }
  }

  async myProjects(req, res, next) {
    try {
      const result = await projectService.findAll({ userId: req.user.id });
      return ApiResponse.success(res, { projects: result.projects });
    } catch (e) { next(e); }
  }

  async findById(req, res, next) {
    try {
      const project = await projectService.findById(req.params.id);
      // Also include mentor assignment info
      const mentorAssignment = await mentorService.getProjectMentor(project.id).catch(() => null);
      return ApiResponse.success(res, { project, mentor_assignment: mentorAssignment });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const project = await projectService.update(req.params.id, req.body, req.user.id, req.user.role);
      return ApiResponse.success(res, { message: 'Projecto actualizado!', project });
    } catch (e) { next(e); }
  }

  async submit(req, res, next) {
    try {
      const project = await projectService.submit(req.params.id, req.user.id);
      return ApiResponse.success(res, { message: 'Projecto submetido para avaliação!', project });
    } catch (e) { next(e); }
  }

  async approve(req, res, next) {
    try {
      const project = await projectService.approve(req.params.id, req.user.id);
      return ApiResponse.success(res, { message: 'Projecto aprovado!', project });
    } catch (e) { next(e); }
  }

  async getStats(req, res, next) {
    try {
      const stats = await projectService.getStats();
      return ApiResponse.success(res, { stats });
    } catch (e) { next(e); }
  }
}

module.exports = new ProjectController();

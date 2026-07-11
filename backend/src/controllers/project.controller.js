'use strict';
const projectService = require('../services/project.service');
const mentorService  = require('../services/mentor.service');
const { ApiResponse } = require('../utils/apiResponse');

class ProjectController {
  async create(req, res, next) {
    try {
      const project = await projectService.create(req.body, req.user.id);
      mentorService.autoAssign(project.id).catch(e => console.warn('[MentorAssign]', e.message));
      return ApiResponse.success(res, { message: 'Projecto criado com sucesso!', project }, 201);
    } catch (e) { next(e); }
  }
  async findAll(req, res, next) {
    try {
      const { page, limit, status, type, search, createdBy } = req.query;
      const result = await projectService.findAll({ page:+page||1, limit:+limit||10, status, type, search, createdBy });
      return ApiResponse.paginated(res, result.projects, { page:result.page, limit:result.limit, total:result.total });
    } catch (e) { next(e); }
  }
  async myProjects(req, res, next) {
    try {
      const result = await projectService.findAll({ userId: req.user.id, limit: 50 });
      return ApiResponse.success(res, { projects: result.projects });
    } catch (e) { next(e); }
  }
  async findById(req, res, next) {
    try {
      const project = await projectService.findById(req.params.id);
      const mentorAssignment = await mentorService.getProjectMentor(project.id).catch(() => null);
      const userEval = req.user ? await projectService.getUserEvaluation(project.id, req.user.id).catch(() => null) : null;
      return ApiResponse.success(res, { project, mentor_assignment: mentorAssignment, user_evaluation: userEval });
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
  async rate(req, res, next) {
    try {
      const result = await projectService.rateProject(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, { message: result.created ? 'Avaliação publicada!' : 'Avaliação actualizada!', ...result });
    } catch (e) { next(e); }
  }
  async getEvaluations(req, res, next) {
    try {
      const { sort } = req.query;
      const evaluations = await projectService.getProjectEvaluations(req.params.id, { sort });
      return ApiResponse.success(res, { evaluations });
    } catch (e) { next(e); }
  }
  async like(req, res, next) {
    try {
      const result = await projectService.likeProject(req.params.id, req.user.id);
      return ApiResponse.success(res, result);
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

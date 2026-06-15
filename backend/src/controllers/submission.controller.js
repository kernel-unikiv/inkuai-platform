'use strict';
const submissionService = require('../services/submission.service');
const mentorService = require('../services/mentor.service');
const { ApiResponse } = require('../utils/apiResponse');

class SubmissionController {
  async create(req, res, next) {
    try {
      const sub = await submissionService.create(req.body, req.user.id);
      return ApiResponse.success(res, { message: 'Entrega submetida com sucesso!', submission: sub }, 201);
    } catch(e) { next(e); }
  }
  async getProjectSubmissions(req, res, next) {
    try {
      const subs = await submissionService.getProjectSubmissions(req.params.projectId, req.user.id, req.user.role);
      return ApiResponse.success(res, { submissions: subs });
    } catch(e) { next(e); }
  }
  async getById(req, res, next) {
    try {
      const sub = await submissionService.getById(req.params.id);
      return ApiResponse.success(res, { submission: sub });
    } catch(e) { next(e); }
  }
  async grade(req, res, next) {
    try {
      const sub = await submissionService.grade(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, { message: 'Avaliação registada!', submission: sub });
    } catch(e) { next(e); }
  }
  async aiFeedback(req, res, next) {
    try {
      const result = await submissionService.generateAIFeedback(req.params.id);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }
  async getProjectMentor(req, res, next) {
    try {
      const assignment = await mentorService.getProjectMentor(req.params.projectId);
      return ApiResponse.success(res, { assignment });
    } catch(e) { next(e); }
  }
}
module.exports = new SubmissionController();

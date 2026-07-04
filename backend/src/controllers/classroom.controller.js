'use strict';
const classroomService = require('../services/classroom.service');
const { ApiResponse } = require('../utils/apiResponse');

class ClassroomController {
  async create(req, res, next) {
    try {
      const c = await classroomService.createClassroom(req.body, req.user.id);
      return ApiResponse.success(res, { message:'Classroom criado!', classroom:c }, 201);
    } catch(e) { next(e); }
  }
  async list(req, res, next) {
    try {
      const { page=1, limit=20 } = req.query;
      const r = await classroomService.listClassrooms(req.user.id, req.user.role, { page:+page, limit:+limit });
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async getOne(req, res, next) {
    try {
      const c = await classroomService.getClassroom(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, { classroom:c });
    } catch(e) { next(e); }
  }
  async submit(req, res, next) {
    try {
      const s = await classroomService.submit(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, { message:'Submetido!', submission:s }, 201);
    } catch(e) { next(e); }
  }
  async execute(req, res, next) {
    try {
      const r = await classroomService.executeSubmission(req.params.submissionId);
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async aiGrade(req, res, next) {
    try {
      const r = await classroomService.aiGrade(req.params.submissionId);
      return ApiResponse.success(res, r);
    } catch(e) { next(e); }
  }
  async mentorGrade(req, res, next) {
    try {
      const { grade, feedback } = req.body;
      const s = await classroomService.mentorGrade(req.params.submissionId, req.user.id, grade, feedback);
      return ApiResponse.success(res, { message:'Avaliado!', submission:s });
    } catch(e) { next(e); }
  }
}
module.exports = new ClassroomController();

'use strict';
const mentorService = require('../services/mentor.service');
const { ApiResponse } = require('../utils/apiResponse');

class MentorController {
  async autoAssign(req, res, next) {
    try {
      const result = await mentorService.autoAssignMentor(req.params.projectId);
      return ApiResponse.success(res, { message:'Mentor atribuído!', ...result });
    } catch(e) { next(e); }
  }
  async getProjectMentor(req, res, next) {
    try {
      const m = await mentorService.getProjectMentor(req.params.projectId);
      return ApiResponse.success(res, { mentor: m });
    } catch(e) { next(e); }
  }
  async getMyMentorships(req, res, next) {
    try {
      const list = await mentorService.getMentorProjects(req.user.id);
      return ApiResponse.success(res, { projects: list });
    } catch(e) { next(e); }
  }
  async reassign(req, res, next) {
    try {
      const a = await mentorService.reassignMentor(req.params.projectId, req.body.mentor_id, req.user.id);
      return ApiResponse.success(res, { message:'Mentor reatribuído!', assignment:a });
    } catch(e) { next(e); }
  }
  async listMentors(req, res, next) {
    try {
      const mentors = await mentorService.listMentorsWithStats();
      return ApiResponse.success(res, { mentors });
    } catch(e) { next(e); }
  }
}
module.exports = new MentorController();

'use strict';
const router = require('express').Router();
const c = require('../controllers/mentor.controller');
const { authorize } = require('../middleware/role.middleware');

router.post('/projects/:projectId/auto-assign', c.autoAssign);
router.get ('/projects/:projectId',             c.getProjectMentor);
router.get ('/my-mentorships',                  c.getMyMentorships);
router.post('/projects/:projectId/reassign',    authorize('admin'), c.reassign);
router.get ('/list',                            c.listMentors);

module.exports = router;

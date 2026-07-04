'use strict';
const router = require('express').Router();
const c = require('../controllers/classroom.controller');

router.post('/',                                   c.create);
router.get ('/',                                   c.list);
router.get ('/:id',                                c.getOne);
router.post('/:id/submit',                         c.submit);
router.post('/submissions/:submissionId/execute',  c.execute);
router.post('/submissions/:submissionId/ai-grade', c.aiGrade);
router.post('/submissions/:submissionId/grade',    c.mentorGrade);

module.exports = router;

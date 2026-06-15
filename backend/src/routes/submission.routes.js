'use strict';
const router = require('express').Router();
const c = require('../controllers/submission.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/',                              c.create);
router.get('/project/:projectId',             c.getProjectSubmissions);
router.get('/project/:projectId/mentor',      c.getProjectMentor);
router.get('/:id',                            c.getById);
router.put('/:id/grade',                      c.grade);
router.post('/:id/ai-feedback',               c.aiFeedback);

module.exports = router;

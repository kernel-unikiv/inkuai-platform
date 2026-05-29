'use strict';
const router = require('express').Router();
const c = require('../controllers/project.controller');
const { authorize } = require('../middleware/role.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const v = require('../validators/project.validator');

router.get('/my',           c.myProjects);
router.get('/stats',        c.getStats);
router.get('/',             c.findAll);
router.post('/',            validateBody(v.create), c.create);
router.get('/:id',          c.findById);
router.put('/:id',          validateBody(v.update), c.update);
router.post('/:id/submit',  c.submit);
router.post('/:id/approve', authorize('admin','mentor'), c.approve);

module.exports = router;

'use strict';
const router = require('express').Router();
const c = require('../controllers/sandbox.controller');
const { validateBody } = require('../middleware/validate.middleware');
const { sandbox } = require('../middleware/rateLimit.middleware');
const v = require('../validators/sandbox.validator');

router.post('/execute',              sandbox, validateBody(v.execute), c.execute);
router.get('/history/:projectId',    c.getHistory);
router.get('/execution/:id',         c.getExecution);

module.exports = router;

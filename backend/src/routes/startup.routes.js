'use strict';
const router = require('express').Router();
const c = require('../controllers/startup.controller');
const { authorize } = require('../middleware/role.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const v = require('../validators/startup.validator');

router.get('/my',             c.myStartups);
router.get('/',               c.findAll);
router.post('/',              validateBody(v.create), c.create);
router.get('/:id',            c.findById);
router.put('/:id',            validateBody(v.update), c.update);
router.post('/:id/members',   c.addMember);

module.exports = router;

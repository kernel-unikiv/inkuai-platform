'use strict';
const router = require('express').Router();
const c = require('../controllers/article.controller');
const { authorize } = require('../middleware/role.middleware');

router.post('/',            c.create);
router.get ('/',            c.list);
router.get ('/:id',         c.getOne);
router.put ('/:id',         c.update);
router.delete('/:id',       c.remove);
router.post('/:id/like',    c.like);
router.post('/:id/feature', authorize('admin'), c.feature);

module.exports = router;

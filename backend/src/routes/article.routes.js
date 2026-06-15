'use strict';
const router = require('express').Router();
const c = require('../controllers/article.controller');
const { authorize } = require('../middleware/role.middleware');

router.get('/',        c.findAll);
router.post('/',       c.create);
router.get('/:id',     c.findById);
router.put('/:id',     c.update);
router.delete('/:id',  c.delete);
router.post('/:id/like', c.like);

module.exports = router;

'use strict';
const router = require('express').Router();
const c = require('../controllers/admin.controller');

router.get('/dashboard',           c.getDashboard);
router.patch('/users/:id/role',    c.setUserRole);
router.patch('/users/:id/toggle',  c.toggleUserActive);

module.exports = router;

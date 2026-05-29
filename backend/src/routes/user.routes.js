'use strict';
const router = require('express').Router();
const c = require('../controllers/user.controller');
const { authorize } = require('../middleware/role.middleware');

router.get('/dashboard/stats',              c.getDashboardStats);
router.get('/notifications',                c.getNotifications);
router.patch('/notifications/:notifId/read', c.markNotificationRead);
router.get('/',                             authorize('admin','mentor'), c.findAll);
router.get('/:id',                          c.findById);
router.put('/:id',                          c.updateProfile);

module.exports = router;

'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');

router.use('/auth',      rateLimitMiddleware.auth, require('./auth.routes'));
router.use('/users',     authenticate, require('./user.routes'));
router.use('/startups',  authenticate, require('./startup.routes'));
router.use('/projects',  authenticate, require('./project.routes'));
router.use('/sandbox',   authenticate, require('./sandbox.routes'));
router.use('/admin',     authenticate, authorize('admin','mentor'), require('./admin.routes'));

router.get('/', (req, res) => res.json({
  name: 'INKU·AI Platform API', version: 'v1.0.0',
  institution: 'IP/UNIKIVI', fundecit: 'Edital Nº 1/2026'
}));
module.exports = router;

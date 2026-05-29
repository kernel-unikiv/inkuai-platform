'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');

router.use('/auth',        rateLimitMiddleware.auth, require('./auth.routes'));
router.use('/users',       authenticate, require('./user.routes'));
router.use('/startups',    authenticate, require('./startup.routes'));
router.use('/projects',    authenticate, require('./project.routes'));
router.use('/sandbox',     authenticate, require('./sandbox.routes'));
router.use('/admin',       authenticate, authorize('admin'), require('./admin.routes'));

router.get('/', (req, res) => res.json({
  name: 'INKU·AI Platform API', version: 'v1.0.0',
  institution: 'IP/UNIKIVI', fundecit: 'Edital Nº 1/2026',
  endpoints: { auth:'/api/v1/auth', users:'/api/v1/users', startups:'/api/v1/startups',
    projects:'/api/v1/projects', sandbox:'/api/v1/sandbox', admin:'/api/v1/admin', docs:'/api/docs' }
}));

module.exports = router;

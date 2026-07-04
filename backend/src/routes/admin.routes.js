'use strict';
const router = require('express').Router();
const c = require('../controllers/admin.controller');
const { authorize } = require('../middleware/role.middleware');

// Middleware: admin OU aprovador designado
const adminOrApprover = authorize('admin','mentor');

// ── Dashboard & Stats
router.get('/dashboard',           c.getDashboard);
router.get('/stats/platform',      c.getPlatformStats);
router.get('/log',                 c.getAdminLog);

// ── Utilizadores (só admin)
router.get('/users',               c.getUsers);
router.post('/users',              authorize('admin'), c.createUser);
router.put('/users/:id',           authorize('admin'), c.updateUser);
router.delete('/users/:id',        authorize('admin'), c.deleteUser);
router.patch('/users/:id/toggle',  authorize('admin'), c.toggleUserActive);
router.patch('/users/:id/role',    authorize('admin'), c.setUserRole);

// ── Projectos
router.get('/projects',                    c.getProjects);
router.put('/projects/:id',                authorize('admin'), c.updateProject);
router.delete('/projects/:id',             authorize('admin'), c.deleteProject);
router.post('/projects/:id/approve',       adminOrApprover, c.approveProject);
router.post('/projects/:id/reject',        adminOrApprover, c.rejectProject);
router.post('/projects/:id/advance',       adminOrApprover, c.advanceProjectStage);
router.get('/projects/:id/stats',          adminOrApprover, c.getProjectStats);

// ── Startups
router.get('/startups',                    c.getStartups);
router.put('/startups/:id',                authorize('admin'), c.updateStartup);
router.delete('/startups/:id',             authorize('admin'), c.deleteStartup);
router.post('/startups/:id/advance',       adminOrApprover, c.advanceStartupStage);
router.get('/startups/:id/stats',          adminOrApprover, c.getStartupStats);

// ── Mensagens
router.get('/messages',            c.getMessages);
router.post('/messages',           c.sendMessage);
router.post('/messages/bulk',      c.sendBulkMessage);
router.patch('/messages/:id/read', c.markMessageRead);

// ── Aprovadores
router.get('/approvers',           authorize('admin'), c.listApprovers);
router.post('/approvers',          authorize('admin'), c.addApprover);
router.delete('/approvers/:id',    authorize('admin'), c.removeApprover);

module.exports = router;

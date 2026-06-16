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

// ── Gestão de Mentores
router.get('/mentors',                     authorize('admin'), async (req, res, next) => {
  try {
    const mentorService = require('../services/mentor.service');
    const mentors = await mentorService.listMentors();
    return res.json({ success: true, mentors });
  } catch(e) { next(e); }
});

router.post('/mentors',                    authorize('admin'), async (req, res, next) => {
  try {
    const mentorService = require('../services/mentor.service');
    const { userId, expertiseAreas, mentorBio } = req.body;
    const mentor = await mentorService.upsertMentor({ userId, expertiseAreas, mentorBio });
    return res.json({ success: true, message: 'Mentor cadastrado com sucesso!', mentor });
  } catch(e) { next(e); }
});

router.delete('/mentors/:userId',          authorize('admin'), async (req, res, next) => {
  try {
    const { User } = require('../models/sql/index');
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Utilizador não encontrado.' });
    await user.update({ role: 'student' });
    return res.json({ success: true, message: 'Mentor removido.' });
  } catch(e) { next(e); }
});

router.post('/mentors/assign',             authorize('admin'), async (req, res, next) => {
  try {
    const mentorService = require('../services/mentor.service');
    const { projectId, mentorId } = req.body;
    const result = await mentorService.manualAssign(projectId, mentorId, req.user.id);
    return res.json({ success: true, message: 'Mentor atribuído!', assignment: result });
  } catch(e) { next(e); }
});

router.post('/mentors/auto-assign/:projectId', authorize('admin'), async (req, res, next) => {
  try {
    const mentorService = require('../services/mentor.service');
    const result = await mentorService.autoAssign(req.params.projectId);
    return res.json({ success: true, message: 'Mentor atribuído pela IA!', assignment: result });
  } catch(e) { next(e); }
});

// ── Notificação em massa (IA ou admin)
router.post('/notify',                     authorize('admin'), async (req, res, next) => {
  try {
    const { Notification, User } = require('../models/sql/index');
    const { Op } = require('sequelize');
    const { title, message, type = 'info', target = 'all', role, url } = req.body;
    let users;
    if (target === 'role' && role) {
      const roles = Array.isArray(role) ? role : [role];
      users = await User.findAll({ where: { role: { [Op.in]: roles }, is_active: true } });
    } else {
      users = await User.findAll({ where: { is_active: true } });
    }
    await Promise.all(users.map(u => Notification.create({
      user_id: u.id, type, title, message, action_url: url || '/dashboard.html'
    })));
    return res.json({ success: true, message: `Notificação enviada a ${users.length} utilizador(es).`, sent: users.length });
  } catch(e) { next(e); }
});

module.exports = router;

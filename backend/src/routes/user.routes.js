'use strict';
const router = require('express').Router();
const c      = require('../controllers/user.controller');
const { authorize } = require('../middleware/role.middleware');
const { Op }        = require('sequelize');

// Dashboard stats do utilizador autenticado
router.get('/dashboard/stats', c.getDashboardStats);

// Notificações do utilizador (via user controller)
router.get('/notifications',                 c.getNotifications);
router.patch('/notifications/:notifId/read', c.markNotificationRead);

// Pesquisar utilizador por email (para envio de mensagens entre utilizadores)
router.get('/search', async (req, res, next) => {
  try {
    const { User } = require('../models/sql/index');
    const { email, search } = req.query;
    if (!email && !search) return res.status(400).json({ success:false, message:'Parâmetro "email" ou "search" obrigatório.' });
    const query = email || search;
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: `%${query}%` } },
          { name:  { [Op.like]: `%${query}%` } }
        ],
        is_active: true
      },
      attributes: ['id','name','email','role','institution'],
      limit: 10
    });
    return res.json({ success:true, data:users });
  } catch(e){ next(e); }
});

// Listar todos (só admin/mentor)
router.get('/', authorize('admin','mentor'), c.findAll);

// Ver perfil de utilizador
router.get('/:id', c.findById);

// Actualizar perfil
router.put('/:id', c.updateProfile);

module.exports = router;

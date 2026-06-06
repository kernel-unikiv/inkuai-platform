'use strict';
const { Op } = require('sequelize');
const {
  User, Project, Startup, Notification, Message,
  Approver, AdminAction, TeamMember, Evaluation
} = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { sequelize } = require('../config/database');

class AdminService {

  // ── LOG de acção admin ──────────────────────────────────
  async _log(adminId, action, targetType, targetId, details, ip) {
    await AdminAction.create({
      admin_id: adminId, action,
      target_type: targetType, target_id: targetId,
      details: JSON.stringify(details || {}),
      ip_address: ip || '0.0.0.0'
    }).catch(() => {}); // nunca falhar por causa do log
  }

  // ── Notificar admin ─────────────────────────────────────
  async _notifyAdmin(adminId, title, message, action_url) {
    await Notification.create({
      user_id: adminId, type: 'info', title, message, action_url
    }).catch(() => {});
  }

  // ── Notificar todos os admins ───────────────────────────
  async _notifyAllAdmins(title, message, action_url) {
    const admins = await User.findAll({ where: { role: 'admin', is_active: true } });
    await Promise.all(admins.map(a =>
      Notification.create({ user_id: a.id, type: 'info', title, message, action_url }).catch(() => {})
    ));
    // Notificar também aprovadores globais
    const approvers = await Approver.findAll({ where: { scope: 'all', is_active: true }, include:[{model:User,as:'approver'}] });
    await Promise.all(approvers.map(ap =>
      Notification.create({ user_id: ap.user_id, type: 'info', title, message, action_url }).catch(() => {})
    ));
  }

  // ═══ DASHBOARD STATS ═══════════════════════════════════
  async getDashboard() {
    const [users, projects, startups, messages, pendingProjects, pendingStartups] = await Promise.all([
      User.count(),
      Project.count(),
      Startup.count(),
      Message.count(),
      Project.count({ where: { status: 'submitted' } }),
      Startup.count({ where: { status: 'draft' } })
    ]);

    // Gráfico de utilizadores por role
    const usersByRole = await User.findAll({
      attributes: ['role', [sequelize.fn('COUNT','*'), 'count']],
      group: ['role'], raw: true
    });

    // Gráfico de projectos por estado
    const projectsByStatus = await Project.findAll({
      attributes: ['status', [sequelize.fn('COUNT','*'), 'count']],
      group: ['status'], raw: true
    });

    // Gráfico de startups por estado
    const startupsByStatus = await Startup.findAll({
      attributes: ['status', [sequelize.fn('COUNT','*'), 'count']],
      group: ['status'], raw: true
    });

    // Últimos 5 utilizadores
    const recentUsers = await User.findAll({
      order: [['created_at','DESC']], limit: 5
    });

    // Últimas 5 acções admin
    const recentActions = await AdminAction.findAll({
      order: [['created_at','DESC']], limit: 10,
      include: [{ model: User, as: 'admin', attributes: ['id','name'] }]
    });

    // Projectos pendentes de aprovação
    const pendingApprovalProjects = await Project.findAll({
      where: { status: 'submitted' }, limit: 5,
      include: [{ model: User, as:'creator', attributes:['id','name'] }],
      order: [['updated_at','DESC']]
    });

    return {
      stats: { users, projects, startups, messages, pendingProjects, pendingStartups },
      charts: { usersByRole, projectsByStatus, startupsByStatus },
      recentUsers: recentUsers.map(u => u.toPublicJSON()),
      recentActions,
      pendingApprovalProjects
    };
  }

  // ═══ GESTÃO DE UTILIZADORES ════════════════════════════
  async getAllUsers({ page=1, limit=20, role, search, is_active }) {
    const where = {};
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) where[Op.or] = [
      { name:  { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
    const { count, rows } = await User.findAndCountAll({
      where, limit, offset: (page-1)*limit,
      order: [['created_at','DESC']]
    });
    return { users: rows.map(u => u.toPublicJSON()), total:count, page, limit };
  }

  async createUser(data, adminId) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) throw new AppError('Email já registado.', 409);
    const user = await User.create({
      name: data.name, email: data.email,
      password_hash: data.password || 'ChangeMe@2026',
      role: data.role || 'student',
      institution: data.institution || 'IP/UNIKIVI',
      is_verified: true, is_active: true
    });
    await this._log(adminId, 'create_user', 'user', user.id, { email: user.email, role: user.role });
    await this._notifyAllAdmins(
      'Novo utilizador criado',
      `Admin criou utilizador: ${user.name} (${user.email}) — role: ${user.role}`,
      `/admin/admin-users.html`
    );
    return user.toPublicJSON();
  }

  async updateUser(targetId, data, adminId) {
    const user = await User.findByPk(targetId);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    const allowed = ['name','role','institution','is_active','bio','github_username'];
    const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    if (filtered.password) {
      filtered.password_hash = filtered.password;
      delete filtered.password;
    }
    const prev = { role: user.role, is_active: user.is_active, name: user.name };
    await user.update(filtered);
    await this._log(adminId, 'update_user', 'user', targetId, { prev, next: filtered });
    await this._notifyAllAdmins(
      'Utilizador actualizado',
      `Admin actualizou ${user.name}: ${JSON.stringify(filtered)}`,
      `/admin/admin-users.html`
    );
    // Notificar o próprio utilizador
    await Notification.create({
      user_id: targetId, type: 'info',
      title: 'O seu perfil foi actualizado',
      message: `Um administrador actualizou o seu perfil. Verifique as suas informações.`,
      action_url: '/profile.html'
    });
    return user.toPublicJSON();
  }

  async deleteUser(targetId, adminId) {
    const user = await User.findByPk(targetId);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    if (user.role === 'admin') throw new AppError('Não é possível eliminar um administrador.', 403);
    const snapshot = { name: user.name, email: user.email, role: user.role };
    await user.destroy();
    await this._log(adminId, 'delete_user', 'user', targetId, snapshot);
    await this._notifyAllAdmins(
      'Utilizador eliminado',
      `Admin eliminou utilizador: ${snapshot.name} (${snapshot.email})`,
      `/admin/admin-users.html`
    );
    return { deleted: true, user: snapshot };
  }

  async toggleUserActive(targetId, adminId) {
    const user = await User.findByPk(targetId);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    if (user.role === 'admin') throw new AppError('Não é possível suspender um administrador.', 403);
    const newState = !user.is_active;
    await user.update({ is_active: newState });
    const action = newState ? 'activate_user' : 'suspend_user';
    await this._log(adminId, action, 'user', targetId, { name: user.name });
    await this._notifyAllAdmins(
      `Utilizador ${newState ? 'activado' : 'suspenso'}`,
      `${user.name} foi ${newState ? 'reactivado' : 'suspenso'} pelo administrador.`,
      `/admin/admin-users.html`
    );
    await Notification.create({
      user_id: targetId, type: newState ? 'success' : 'warning',
      title: `A sua conta foi ${newState ? 'reactivada' : 'suspensa'}`,
      message: newState
        ? 'A sua conta foi reactivada. Pode voltar a aceder à plataforma.'
        : 'A sua conta foi suspensa. Contacte o administrador para mais informações.',
      action_url: '/login.html'
    });
    return user.toPublicJSON();
  }

  async setUserRole(targetId, role, adminId) {
    const user = await User.findByPk(targetId);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    const prevRole = user.role;
    await user.update({ role });
    await this._log(adminId, 'change_role', 'user', targetId, { prevRole, newRole: role });
    await this._notifyAllAdmins(
      'Role de utilizador alterado',
      `${user.name}: ${prevRole} → ${role}`,
      `/admin/admin-users.html`
    );
    await Notification.create({
      user_id: targetId, type: 'info',
      title: 'O seu papel na plataforma foi alterado',
      message: `O seu papel foi alterado de "${prevRole}" para "${role}".`,
      action_url: '/dashboard.html'
    });
    return user.toPublicJSON();
  }

  // ═══ GESTÃO DE PROJECTOS ═══════════════════════════════
  async getAllProjects({ page=1, limit=20, status, type, search }) {
    const where = {};
    if (status) where.status = status;
    if (type)   where.type   = type;
    if (search) where.title  = { [Op.like]: `%${search}%` };
    const { count, rows } = await Project.findAndCountAll({
      where, limit, offset: (page-1)*limit,
      include: [
        { model: User,    as:'creator', attributes:['id','name','email'] },
        { model: Startup, as:'startup', attributes:['id','name'] }
      ],
      order: [['updated_at','DESC']]
    });
    return { projects: rows, total:count, page, limit };
  }

  async updateProject(projectId, data, adminId) {
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    const prevStatus = project.status;
    const allowed = ['title','description','status','type','is_public','version'];
    const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    await project.update(filtered);
    await this._log(adminId, 'update_project', 'project', projectId, { prev: { status: prevStatus }, next: filtered });
    await this._notifyAllAdmins(
      'Projecto actualizado pelo admin',
      `Projecto "${project.title}" foi actualizado. Estado: ${prevStatus} → ${project.status}`,
      `/project-detail.html?id=${projectId}`
    );
    await Notification.create({
      user_id: project.created_by, type: 'info',
      title: 'O seu projecto foi actualizado',
      message: `O administrador actualizou o seu projecto "${project.title}". Estado: ${project.status}`,
      action_url: `/project-detail.html?id=${projectId}`
    });
    return project;
  }

  async deleteProject(projectId, adminId) {
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    const snapshot = { title: project.title, status: project.status, owner: project.created_by };
    await project.destroy();
    await this._log(adminId, 'delete_project', 'project', projectId, snapshot);
    await this._notifyAllAdmins(
      'Projecto eliminado',
      `Admin eliminou o projecto: "${snapshot.title}"`,
      `/admin/admin-dashboard.html`
    );
    await Notification.create({
      user_id: snapshot.owner, type: 'error',
      title: 'O seu projecto foi eliminado',
      message: `O projecto "${snapshot.title}" foi eliminado pelo administrador.`,
      action_url: '/projects.html'
    });
    return { deleted: true };
  }

  async approveProject(projectId, adminId, note) {
    // Verificar se o admin ou aprovador autorizado
    const isApprover = await this._isApprover(adminId, 'project', projectId);
    if (!isApprover) throw new AppError('Sem permissão para aprovar projectos.', 403);

    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (!['submitted','under_review'].includes(project.status))
      throw new AppError('Apenas projectos submetidos ou em revisão podem ser aprovados.', 400);

    await project.update({ status: 'approved' });
    if (note) {
      await Evaluation.create({
        project_id: projectId, evaluator_id: adminId,
        score: 100, feedback: note, status: 'completed'
      });
    }
    await this._log(adminId, 'approve_project', 'project', projectId, { note });
    await this._notifyAllAdmins(
      'Projecto aprovado',
      `Projecto "${project.title}" foi aprovado.`,
      `/project-detail.html?id=${projectId}`
    );
    await Notification.create({
      user_id: project.created_by, type: 'success',
      title: '🎉 O seu projecto foi aprovado!',
      message: `O projecto "${project.title}" foi aprovado${note ? `: ${note}` : '.'}`,
      action_url: `/project-detail.html?id=${projectId}`
    });
    return project;
  }

  async rejectProject(projectId, adminId, reason) {
    const isApprover = await this._isApprover(adminId, 'project', projectId);
    if (!isApprover) throw new AppError('Sem permissão.', 403);
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    await project.update({ status: 'rejected' });
    if (reason) {
      await Evaluation.create({
        project_id: projectId, evaluator_id: adminId,
        score: 0, feedback: reason, status: 'completed'
      });
    }
    await this._log(adminId, 'reject_project', 'project', projectId, { reason });
    await Notification.create({
      user_id: project.created_by, type: 'error',
      title: 'Projecto não aprovado',
      message: `O projecto "${project.title}" não foi aprovado${reason ? `. Motivo: ${reason}` : '.'}`,
      action_url: `/project-detail.html?id=${projectId}`
    });
    await this._notifyAllAdmins(
      'Projecto rejeitado',
      `Projecto "${project.title}" foi rejeitado.`,
      `/admin/admin-dashboard.html`
    );
    return project;
  }

  async advanceProjectStage(projectId, adminId, newStatus) {
    const validTransitions = {
      draft:        ['submitted'],
      submitted:    ['under_review','approved','rejected'],
      under_review: ['approved','rejected'],
      approved:     ['in_progress'],
      in_progress:  ['completed'],
    };
    const project = await Project.findByPk(projectId);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    const allowed = validTransitions[project.status] || [];
    if (!allowed.includes(newStatus))
      throw new AppError(`Não é possível transitar de "${project.status}" para "${newStatus}".`, 400);
    const prev = project.status;
    await project.update({ status: newStatus });
    await this._log(adminId, 'advance_stage', 'project', projectId, { from: prev, to: newStatus });
    await Notification.create({
      user_id: project.created_by, type: 'success',
      title: `Projecto avançou para "${newStatus}"`,
      message: `O projecto "${project.title}" avançou de "${prev}" para "${newStatus}".`,
      action_url: `/project-detail.html?id=${projectId}`
    });
    await this._notifyAllAdmins(
      `Projecto avançou de etapa`,
      `"${project.title}": ${prev} → ${newStatus}`,
      `/project-detail.html?id=${projectId}`
    );
    return project;
  }

  // ═══ GESTÃO DE STARTUPS ════════════════════════════════
  async getAllStartups({ page=1, limit=20, status, search }) {
    const where = {};
    if (status) where.status = status;
    if (search) where.name   = { [Op.like]: `%${search}%` };
    const { count, rows } = await Startup.findAndCountAll({
      where, limit, offset: (page-1)*limit,
      include: [{ model: User, as:'owner', attributes:['id','name','email'] }],
      order: [['updated_at','DESC']]
    });
    return { startups: rows, total:count, page, limit };
  }

  async updateStartup(startupId, data, adminId) {
    const startup = await Startup.findByPk(startupId);
    if (!startup) throw new AppError('Startup não encontrada.', 404);
    const prevStatus = startup.status;
    const allowed = ['name','description','sector','status','github_url','website_url'];
    const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    await startup.update(filtered);
    await this._log(adminId, 'update_startup', 'startup', startupId, { prev: { status: prevStatus }, next: filtered });
    await this._notifyAllAdmins(
      'Startup actualizada pelo admin',
      `Startup "${startup.name}": ${prevStatus} → ${startup.status}`,
      `/startup-detail.html?id=${startupId}`
    );
    await Notification.create({
      user_id: startup.owner_id, type: 'info',
      title: 'A sua startup foi actualizada',
      message: `O administrador actualizou a sua startup "${startup.name}".`,
      action_url: `/startup-detail.html?id=${startupId}`
    });
    return startup;
  }

  async deleteStartup(startupId, adminId) {
    const startup = await Startup.findByPk(startupId);
    if (!startup) throw new AppError('Startup não encontrada.', 404);
    const snapshot = { name: startup.name, owner: startup.owner_id };
    await startup.destroy();
    await this._log(adminId, 'delete_startup', 'startup', startupId, snapshot);
    await this._notifyAllAdmins('Startup eliminada', `Admin eliminou startup: "${snapshot.name}"`, `/admin/admin-dashboard.html`);
    await Notification.create({
      user_id: snapshot.owner, type: 'error',
      title: 'A sua startup foi eliminada',
      message: `A startup "${snapshot.name}" foi eliminada pelo administrador.`,
      action_url: '/startups.html'
    });
    return { deleted: true };
  }

  async advanceStartupStage(startupId, adminId, newStatus) {
    const startup = await Startup.findByPk(startupId);
    if (!startup) throw new AppError('Startup não encontrada.', 404);
    const isApprover = await this._isApprover(adminId, 'startup', startupId);
    if (!isApprover) throw new AppError('Sem permissão para avançar startup.', 403);
    const prev = startup.status;
    await startup.update({ status: newStatus });
    await this._log(adminId, 'advance_startup', 'startup', startupId, { from: prev, to: newStatus });
    await Notification.create({
      user_id: startup.owner_id, type: 'success',
      title: `Startup avançou para "${newStatus}"`,
      message: `A startup "${startup.name}" avançou de "${prev}" para "${newStatus}".`,
      action_url: `/startup-detail.html?id=${startupId}`
    });
    await this._notifyAllAdmins(`Startup avançou de etapa`, `"${startup.name}": ${prev} → ${newStatus}`, `/startup-detail.html?id=${startupId}`);
    return startup;
  }

  // ═══ MENSAGENS ADMIN ═══════════════════════════════════
  async sendMessage(senderId, { receiver_id, subject, body, context_type, context_id }) {
    const receiver = await User.findByPk(receiver_id);
    if (!receiver) throw new AppError('Destinatário não encontrado.', 404);
    const message = await Message.create({ sender_id: senderId, receiver_id, subject, body, context_type, context_id });
    // Notificar destinatário
    const sender = await User.findByPk(senderId);
    await Notification.create({
      user_id: receiver_id, type: 'info',
      title: `Nova mensagem de ${sender.name}`,
      message: subject || body.substring(0, 80),
      action_url: `/messages.html`
    });
    return message;
  }

  async sendBulkMessage(senderId, { user_ids, subject, body }) {
    const messages = [];
    for (const uid of user_ids) {
      try {
        const msg = await this.sendMessage(senderId, { receiver_id: uid, subject, body });
        messages.push(msg);
      } catch {}
    }
    return { sent: messages.length };
  }

  async getMessages(userId, { page=1, limit=20, type='inbox' }) {
    const where = type === 'sent' ? { sender_id: userId } : { receiver_id: userId };
    const { count, rows } = await Message.findAndCountAll({
      where, limit, offset:(page-1)*limit,
      include: [
        { model: User, as:'sender',   attributes:['id','name','role'] },
        { model: User, as:'receiver', attributes:['id','name','role'] }
      ],
      order:[['created_at','DESC']]
    });
    return { messages: rows, total:count, page, limit };
  }

  async markMessageRead(messageId, userId) {
    const message = await Message.findByPk(messageId);
    if (!message || message.receiver_id !== userId) throw new AppError('Mensagem não encontrada.', 404);
    await message.update({ is_read: true });
    return message;
  }

  // ═══ GESTÃO DE APROVADORES ═════════════════════════════
  async addApprover(adminId, { user_id, scope='all', scope_id=null }) {
    const user = await User.findByPk(user_id);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    const existing = await Approver.findOne({ where: { user_id, scope, scope_id: scope_id || null, is_active: true } });
    if (existing) throw new AppError('Utilizador já é aprovador para este âmbito.', 409);
    const approver = await Approver.create({ user_id, granted_by: adminId, scope, scope_id });
    await this._log(adminId, 'add_approver', 'user', user_id, { scope, scope_id });
    await Notification.create({
      user_id, type: 'success',
      title: 'Passou a ser aprovador',
      message: `Foi designado como aprovador de ${scope === 'all' ? 'todos os projectos e startups' : scope + (scope_id ? ` (${scope_id})` : 's')}.`,
      action_url: '/dashboard.html'
    });
    return { approver, user: user.toPublicJSON() };
  }

  async removeApprover(adminId, approverId) {
    const approver = await Approver.findByPk(approverId);
    if (!approver) throw new AppError('Aprovador não encontrado.', 404);
    await approver.update({ is_active: false });
    await this._log(adminId, 'remove_approver', 'user', approver.user_id, { approverId });
    return { removed: true };
  }

  async listApprovers() {
    return Approver.findAll({
      where: { is_active: true },
      include: [{ model: User, as:'approver', attributes:['id','name','email','role'] }],
      order: [['created_at','DESC']]
    });
  }

  async _isApprover(userId, scope, scopeId) {
    const user = await User.findByPk(userId);
    if (user?.role === 'admin') return true;
    const approver = await Approver.findOne({
      where: {
        user_id: userId, is_active: true,
        [Op.or]: [
          { scope: 'all' },
          { scope, scope_id: scopeId },
          { scope, scope_id: null }
        ]
      }
    });
    return !!approver;
  }

  // ═══ ESTATÍSTICAS AVANÇADAS ════════════════════════════
  async getProjectStats(projectId, requesterId) {
    const isApprover = await this._isApprover(requesterId, 'project', projectId);
    if (!isApprover) throw new AppError('Sem permissão para ver estatísticas deste projecto.', 403);
    const project = await Project.findByPk(projectId, {
      include: [
        { model: Evaluation, as:'evaluations', include:[{model:User,as:'evaluator',attributes:['name']}] },
        { model: User, as:'creator', attributes:['id','name','email'] },
        { model: Startup, as:'startup', attributes:['id','name'] }
      ]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    // Histórico de estados a partir do log
    const stageHistory = await AdminAction.findAll({
      where: { target_type:'project', target_id: projectId, action: { [Op.in]: ['advance_stage','approve_project','reject_project'] } },
      include:[{model:User,as:'admin',attributes:['name']}],
      order:[['created_at','ASC']]
    });
    const avgScore = project.evaluations?.length
      ? project.evaluations.reduce((a,e)=>a+(e.score||0),0)/project.evaluations.length
      : null;
    return { project, avgScore, evaluationCount: project.evaluations?.length, stageHistory };
  }

  async getStartupStats(startupId, requesterId) {
    const isApprover = await this._isApprover(requesterId, 'startup', startupId);
    if (!isApprover) throw new AppError('Sem permissão.', 403);
    const startup = await Startup.findByPk(startupId, {
      include: [
        { model: User, as:'owner', attributes:['id','name','email'] },
        { model: TeamMember, as:'members', include:[{model:User,as:'user',attributes:['id','name','role']}] },
        { model: Project, as:'projects', attributes:['id','title','status','type'] }
      ]
    });
    if (!startup) throw new AppError('Startup não encontrada.', 404);
    const stageHistory = await AdminAction.findAll({
      where: { target_type:'startup', target_id: startupId },
      include:[{model:User,as:'admin',attributes:['name']}],
      order:[['created_at','ASC']]
    });
    return { startup, stageHistory, projectsCount: startup.projects?.length, membersCount: startup.members?.length };
  }

  async getPlatformStats() {
    const [totalUsers, totalProjects, totalStartups, activeProjects] = await Promise.all([
      User.count(),
      Project.count(),
      Startup.count(),
      Project.count({ where: { status: { [Op.in]: ['approved','in_progress'] } } })
    ]);
    const last30 = new Date(Date.now() - 30*24*60*60*1000);
    const newUsersMonth = await User.count({ where: { created_at: { [Op.gte]: last30 } } });
    const newProjectsMonth = await Project.count({ where: { created_at: { [Op.gte]: last30 } } });
    const completedProjects = await Project.count({ where: { status: 'completed' } });
    return { totalUsers, totalProjects, totalStartups, activeProjects, newUsersMonth, newProjectsMonth, completedProjects };
  }

  async getAdminLog({ page=1, limit=30 }) {
    const { count, rows } = await AdminAction.findAndCountAll({
      order:[['created_at','DESC']], limit, offset:(page-1)*limit,
      include:[{model:User,as:'admin',attributes:['id','name']}]
    });
    return { actions: rows, total:count, page, limit };
  }
}

module.exports = new AdminService();

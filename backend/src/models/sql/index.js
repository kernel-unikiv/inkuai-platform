'use strict';
const User          = require('./User.model');
const Startup       = require('./Startup.model');
const Project       = require('./Project.model');
const TeamMember    = require('./TeamMember.model');
const Evaluation    = require('./Evaluation.model');
const Notification  = require('./Notification.model');
const Message       = require('./Message.model');
const Approver      = require('./Approver.model');
const AdminAction   = require('./AdminAction.model');
const AIConversation  = require('./AIConversation.model');
const AIPendingAction = require('./AIPendingAction.model');

// ── User / Startup
User.hasMany(Startup,   { foreignKey:'owner_id',   as:'ownedStartups', onDelete:'CASCADE' });
Startup.belongsTo(User, { foreignKey:'owner_id',   as:'owner' });

// ── Startup / TeamMember
Startup.hasMany(TeamMember,   { foreignKey:'startup_id', as:'members', onDelete:'CASCADE' });
TeamMember.belongsTo(Startup, { foreignKey:'startup_id' });
TeamMember.belongsTo(User,    { foreignKey:'user_id',    as:'user' });

// ── User / Project / Startup
User.hasMany(Project,    { foreignKey:'created_by', as:'projects', onDelete:'CASCADE' });
Project.belongsTo(User,  { foreignKey:'created_by', as:'creator' });
Startup.hasMany(Project, { foreignKey:'startup_id', as:'projects', onDelete:'CASCADE' });
Project.belongsTo(Startup,   { foreignKey:'startup_id', as:'startup' });

// ── Evaluation
Project.hasMany(Evaluation,   { foreignKey:'project_id',   as:'evaluations', onDelete:'CASCADE' });
Evaluation.belongsTo(Project, { foreignKey:'project_id' });
Evaluation.belongsTo(User,    { foreignKey:'evaluator_id', as:'evaluator' });

// ── Notification
User.hasMany(Notification,   { foreignKey:'user_id', as:'notifications', onDelete:'CASCADE' });
Notification.belongsTo(User, { foreignKey:'user_id' });

// ── Message
User.hasMany(Message, { foreignKey:'sender_id',   as:'sentMessages' });
User.hasMany(Message, { foreignKey:'receiver_id', as:'receivedMessages' });
Message.belongsTo(User, { foreignKey:'sender_id',   as:'sender' });
Message.belongsTo(User, { foreignKey:'receiver_id', as:'receiver' });

// ── Approver
User.hasMany(Approver,   { foreignKey:'user_id',    as:'approverRoles' });
User.hasMany(Approver,   { foreignKey:'granted_by', as:'grantedApprovals' });
Approver.belongsTo(User, { foreignKey:'user_id',    as:'approver' });
Approver.belongsTo(User, { foreignKey:'granted_by', as:'grantedByAdmin' });

// ── AdminAction
User.hasMany(AdminAction,   { foreignKey:'admin_id', as:'adminActions' });
AdminAction.belongsTo(User, { foreignKey:'admin_id', as:'admin' });

// ── AIConversation
User.hasMany(AIConversation,   { foreignKey:'user_id', as:'aiConversations' });
AIConversation.belongsTo(User, { foreignKey:'user_id', as:'user' });

// ── AIPendingAction (reviewed_by é opcional — sem FK obrigatória)
// Não definimos FK aqui para evitar conflito com allowNull:true

module.exports = {
  User, Startup, Project, TeamMember, Evaluation,
  Notification, Message, Approver, AdminAction,
  AIConversation, AIPendingAction
};

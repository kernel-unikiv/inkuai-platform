'use strict';
const User             = require('./User.model');
const Startup          = require('./Startup.model');
const Project          = require('./Project.model');
const TeamMember       = require('./TeamMember.model');
const Evaluation       = require('./Evaluation.model');
const Notification     = require('./Notification.model');
const Message          = require('./Message.model');
const Approver         = require('./Approver.model');
const AdminAction      = require('./AdminAction.model');
const AIConversation   = require('./AIConversation.model');
const AIPendingAction  = require('./AIPendingAction.model');
const Article          = require('./Article.model');
const MentorAssignment = require('./MentorAssignment.model');
const ProjectSubmission= require('./ProjectSubmission.model');
const Comment          = require('./Comment.model');
const Follow           = require('./Follow.model');
const Reputation       = require('./Reputation.model');
const ProjectRoadmap   = require('./ProjectRoadmap.model');
const MediaLibrary     = require('./MediaLibrary.model');

// ── User / Startup
User.hasMany(Startup,   { foreignKey:'owner_id',   as:'ownedStartups', onDelete:'CASCADE' });
Startup.belongsTo(User, { foreignKey:'owner_id',   as:'owner' });

// ── Startup / TeamMember
Startup.hasMany(TeamMember,   { foreignKey:'startup_id', as:'members', onDelete:'CASCADE' });
TeamMember.belongsTo(Startup, { foreignKey:'startup_id' });
TeamMember.belongsTo(User,    { foreignKey:'user_id', as:'user' });

// ── User / Project
User.hasMany(Project,    { foreignKey:'created_by', as:'projects', onDelete:'CASCADE' });
Project.belongsTo(User,  { foreignKey:'created_by', as:'creator' });
Startup.hasMany(Project, { foreignKey:'startup_id', as:'projects', onDelete:'CASCADE' });
Project.belongsTo(Startup,   { foreignKey:'startup_id', as:'startup' });

// ── Evaluation
Project.hasMany(Evaluation,   { foreignKey:'project_id', as:'evaluations', onDelete:'CASCADE' });
Evaluation.belongsTo(Project, { foreignKey:'project_id' });
Evaluation.belongsTo(User,    { foreignKey:'evaluator_id', as:'evaluator' });

// ── Notification / Message
User.hasMany(Notification,   { foreignKey:'user_id', as:'notifications', onDelete:'CASCADE' });
Notification.belongsTo(User, { foreignKey:'user_id' });
User.hasMany(Message, { foreignKey:'sender_id',   as:'sentMessages' });
User.hasMany(Message, { foreignKey:'receiver_id', as:'receivedMessages' });
Message.belongsTo(User, { foreignKey:'sender_id',   as:'sender' });
Message.belongsTo(User, { foreignKey:'receiver_id', as:'receiver' });

// ── Approver / AdminAction
User.hasMany(Approver,   { foreignKey:'user_id', as:'approverRoles' });
Approver.belongsTo(User, { foreignKey:'user_id', as:'approver' });
User.hasMany(AdminAction,   { foreignKey:'admin_id', as:'adminActions' });
AdminAction.belongsTo(User, { foreignKey:'admin_id', as:'admin' });

// ── AI
User.hasMany(AIConversation,   { foreignKey:'user_id', as:'aiConversations' });
AIConversation.belongsTo(User, { foreignKey:'user_id', as:'user' });

// ── Article
User.hasMany(Article,    { foreignKey:'author_id', as:'articles', onDelete:'CASCADE' });
Article.belongsTo(User,  { foreignKey:'author_id', as:'author' });
Project.hasMany(Article, { foreignKey:'project_id', as:'articles' });
Article.belongsTo(Project, { foreignKey:'project_id', as:'project' });

// ── MentorAssignment
Project.hasMany(MentorAssignment, { foreignKey:'project_id', as:'mentorAssignments', onDelete:'CASCADE' });
MentorAssignment.belongsTo(Project, { foreignKey:'project_id', as:'project' });
User.hasMany(MentorAssignment,    { foreignKey:'mentor_id', as:'mentorings' });
MentorAssignment.belongsTo(User,  { foreignKey:'mentor_id', as:'mentor' });

// ── ProjectSubmission
Project.hasMany(ProjectSubmission, { foreignKey:'project_id', as:'submissions', onDelete:'CASCADE' });
ProjectSubmission.belongsTo(Project, { foreignKey:'project_id', as:'project' });
User.hasMany(ProjectSubmission, { foreignKey:'submitted_by', as:'submittedWork' });
ProjectSubmission.belongsTo(User, { foreignKey:'submitted_by', as:'submitter' });
User.hasMany(ProjectSubmission, { foreignKey:'reviewed_by', as:'reviewedWork' });
ProjectSubmission.belongsTo(User, { foreignKey:'reviewed_by', as:'reviewer' });

// ── Comment
User.hasMany(Comment,    { foreignKey:'author_id', as:'comments', onDelete:'CASCADE' });
Comment.belongsTo(User,  { foreignKey:'author_id', as:'author' });
Comment.hasMany(Comment, { foreignKey:'parent_id', as:'replies', onDelete:'CASCADE' });
Comment.belongsTo(Comment, { foreignKey:'parent_id', as:'parent' });

// ── Follow
User.hasMany(Follow, { foreignKey:'follower_id', as:'following', onDelete:'CASCADE' });
Follow.belongsTo(User, { foreignKey:'follower_id', as:'follower' });

// ── Reputation (1:1)
User.hasOne(Reputation,   { foreignKey:'user_id', as:'reputation', onDelete:'CASCADE' });
Reputation.belongsTo(User, { foreignKey:'user_id', as:'user' });

// ── ProjectRoadmap
Project.hasMany(ProjectRoadmap, { foreignKey:'project_id', as:'roadmap', onDelete:'CASCADE' });
ProjectRoadmap.belongsTo(Project, { foreignKey:'project_id', as:'project' });

// ── MediaLibrary
User.hasMany(MediaLibrary, { foreignKey:'owner_id', as:'media', onDelete:'CASCADE' });
MediaLibrary.belongsTo(User, { foreignKey:'owner_id', as:'owner' });
Project.hasMany(MediaLibrary, { foreignKey:'project_id', as:'media' });
MediaLibrary.belongsTo(Project, { foreignKey:'project_id', as:'project' });

module.exports = {
  User, Startup, Project, TeamMember, Evaluation,
  Notification, Message, Approver, AdminAction,
  AIConversation, AIPendingAction,
  Article, MentorAssignment, ProjectSubmission,
  Comment, Follow, Reputation, ProjectRoadmap, MediaLibrary
};

'use strict';
const User         = require('./User.model');
const Startup      = require('./Startup.model');
const Project      = require('./Project.model');
const TeamMember   = require('./TeamMember.model');
const Evaluation   = require('./Evaluation.model');
const Notification = require('./Notification.model');

// Associações
User.hasMany(Startup,    { foreignKey:'owner_id',    as:'ownedStartups' });
Startup.belongsTo(User,  { foreignKey:'owner_id',    as:'owner' });

Startup.hasMany(TeamMember,  { foreignKey:'startup_id', as:'members' });
TeamMember.belongsTo(Startup,{ foreignKey:'startup_id' });
TeamMember.belongsTo(User,   { foreignKey:'user_id',    as:'user' });

User.hasMany(Project,    { foreignKey:'created_by',  as:'projects' });
Project.belongsTo(User,  { foreignKey:'created_by',  as:'creator' });
Startup.hasMany(Project, { foreignKey:'startup_id',  as:'projects' });
Project.belongsTo(Startup,   { foreignKey:'startup_id',  as:'startup' });

Project.hasMany(Evaluation,  { foreignKey:'project_id', as:'evaluations' });
Evaluation.belongsTo(Project,{ foreignKey:'project_id' });
Evaluation.belongsTo(User,   { foreignKey:'evaluator_id', as:'evaluator' });

User.hasMany(Notification,   { foreignKey:'user_id',    as:'notifications' });
Notification.belongsTo(User, { foreignKey:'user_id' });

module.exports = { User, Startup, Project, TeamMember, Evaluation, Notification };

"use strict";
const User = require("./User.model");
const Startup = require("./Startup.model");
const Project = require("./Project.model");
const TeamMember = require("./TeamMember.model");
const Evaluation = require("./Evaluation.model");
const Notification = require("./Notification.model");

// Associações
User.hasMany(Startup, {
  foreignKey: "owner_id",
  as: "ownedStartups",
  onDelete: "CASCADE",
});
Startup.belongsTo(User, {
  foreignKey: "owner_id",
  as: "owner",
  targetKey: "id",
});

Startup.hasMany(TeamMember, {
  foreignKey: "startup_id",
  as: "members",
  onDelete: "CASCADE",
});
TeamMember.belongsTo(Startup, { foreignKey: "startup_id", targetKey: "id" });
TeamMember.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  targetKey: "id",
});

User.hasMany(Project, {
  foreignKey: "created_by",
  as: "projects",
  onDelete: "CASCADE",
});
Project.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator",
  targetKey: "id",
});
Startup.hasMany(Project, {
  foreignKey: "startup_id",
  as: "projects",
  onDelete: "CASCADE",
});
Project.belongsTo(Startup, {
  foreignKey: "startup_id",
  as: "startup",
  targetKey: "id",
});

Project.hasMany(Evaluation, {
  foreignKey: "project_id",
  as: "evaluations",
  onDelete: "CASCADE",
});
Evaluation.belongsTo(Project, { foreignKey: "project_id", targetKey: "id" });
Evaluation.belongsTo(User, {
  foreignKey: "evaluator_id",
  as: "evaluator",
  targetKey: "id",
});

User.hasMany(Notification, {
  foreignKey: "user_id",
  as: "notifications",
  onDelete: "CASCADE",
});
Notification.belongsTo(User, { foreignKey: "user_id", targetKey: "id" });

module.exports = {
  User,
  Startup,
  Project,
  TeamMember,
  Evaluation,
  Notification,
};

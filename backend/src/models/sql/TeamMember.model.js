'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const TeamMember = sequelize.define('TeamMember', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  startup_id:   { type: DataTypes.UUID, allowNull: false },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  role_in_team: { type: DataTypes.STRING(30), defaultValue: 'developer' },
  joined_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'team_members', timestamps: true, underscored: true });
module.exports = TeamMember;

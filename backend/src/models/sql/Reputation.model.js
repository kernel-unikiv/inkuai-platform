'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Reputation = sequelize.define('Reputation', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:   { type: DataTypes.UUID, allowNull: false },
  xp:        { type: DataTypes.INTEGER, defaultValue: 0 },
  level:     { type: DataTypes.INTEGER, defaultValue: 1 },
  badge:     { type: DataTypes.STRING(50), defaultValue: 'Iniciante' },
  // counters
  projects_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
  submissions_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
  comments_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
  articles_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
  mentorings_count:   { type: DataTypes.INTEGER, defaultValue: 0 },
  followers_count:    { type: DataTypes.INTEGER, defaultValue: 0 },
  following_count:    { type: DataTypes.INTEGER, defaultValue: 0 },
  streak_days:        { type: DataTypes.INTEGER, defaultValue: 0 },
  last_activity:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'reputations', timestamps: true, underscored: true });
module.exports = Reputation;

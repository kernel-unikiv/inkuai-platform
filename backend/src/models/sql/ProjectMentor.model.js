'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ProjectMentor = sequelize.define('ProjectMentor', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:   { type: DataTypes.UUID, allowNull: false },
  mentor_id:    { type: DataTypes.UUID, allowNull: false },
  assigned_by:  { type: DataTypes.STRING(10), defaultValue: 'ai' },
  area:         { type: DataTypes.STRING(50) },
  status:       { type: DataTypes.STRING(20), defaultValue: 'active' },
  ai_score:     { type: DataTypes.FLOAT, allowNull: true },
  notes:        { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'project_mentors', timestamps: true, underscored: true });

module.exports = ProjectMentor;

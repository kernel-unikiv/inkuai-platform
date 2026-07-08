'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const ProjectRoadmap = sequelize.define('ProjectRoadmap', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:  { type: DataTypes.UUID, allowNull: false },
  phase:       { type: DataTypes.STRING(30), defaultValue: 'ideacao' },
  // ideacao|validacao|prototipo|mvp|lancamento|crescimento
  title:       { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  tasks_json:  { type: DataTypes.TEXT, defaultValue: '[]' },
  resources_json:{ type: DataTypes.TEXT, defaultValue: '[]' },
  status:      { type: DataTypes.STRING(20), defaultValue: 'pending' },
  // pending|active|completed
  progress:    { type: DataTypes.INTEGER, defaultValue: 0 }, // 0-100
  due_date:    { type: DataTypes.DATE, allowNull: true },
  completed_at:{ type: DataTypes.DATE, allowNull: true },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
  ai_notes:    { type: DataTypes.TEXT }, // notas do mentor IA
}, { tableName: 'project_roadmaps', timestamps: true, underscored: true });
module.exports = ProjectRoadmap;

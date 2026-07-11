'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Project = sequelize.define('Project', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:           { type: DataTypes.STRING(200), allowNull: false },
  description:     { type: DataTypes.TEXT },
  startup_id:      { type: DataTypes.UUID, allowNull: true },
  created_by:      { type: DataTypes.UUID, allowNull: false },
  type:            { type: DataTypes.STRING(30), defaultValue: 'software' },
  status:          { type: DataTypes.STRING(30), defaultValue: 'draft' },
  // Apresentação visual
  cover_url:       { type: DataTypes.TEXT },
  logo_url:        { type: DataTypes.TEXT },
  gallery_json:    { type: DataTypes.TEXT, defaultValue: '[]' },
  video_url:       { type: DataTypes.TEXT },
  demo_url:        { type: DataTypes.TEXT },
  docs_url:        { type: DataTypes.TEXT },
  // Repositório
  github_repo_url: { type: DataTypes.STRING(500) },
  github_repo_id:  { type: DataTypes.STRING(50) },
  // Stack & Tags
  tech_stack_json: { type: DataTypes.TEXT, defaultValue: '[]' },
  tags_json:       { type: DataTypes.TEXT, defaultValue: '[]' },
  // Meta
  version:         { type: DataTypes.STRING(20), defaultValue: '1.0.0' },
  is_public:       { type: DataTypes.BOOLEAN, defaultValue: false },
  // Incubação
  current_phase:   { type: DataTypes.STRING(30), defaultValue: 'ideacao' },
  incubation_score:{ type: DataTypes.FLOAT, defaultValue: 0 },
  // Engagement
  views:           { type: DataTypes.INTEGER, defaultValue: 0 },
  likes:           { type: DataTypes.INTEGER, defaultValue: 0 },
  downloads:       { type: DataTypes.INTEGER, defaultValue: 0 },
  // Avaliação agregada
  avg_stars:       { type: DataTypes.FLOAT, defaultValue: 0 },
  eval_count:      { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'projects',
  timestamps: true,
  underscored: true,
});

module.exports = Project;

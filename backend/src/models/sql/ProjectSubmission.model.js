'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ProjectSubmission = sequelize.define('ProjectSubmission', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:   { type: DataTypes.UUID, allowNull: false },
  submitted_by: { type: DataTypes.UUID, allowNull: false },
  title:        { type: DataTypes.STRING(300), allowNull: false },
  description:  { type: DataTypes.TEXT },
  type:         { type: DataTypes.STRING(30), defaultValue: 'entrega' }, // entrega, milestone, relatorio, apresentacao
  files_json:   { type: DataTypes.TEXT, defaultValue: '[]' },   // uploaded files metadata
  links_json:   { type: DataTypes.TEXT, defaultValue: '[]' },   // github, demo, docs links
  code_snippet: { type: DataTypes.TEXT },   // inline code
  status:       { type: DataTypes.STRING(20), defaultValue: 'submitted' }, // submitted, reviewed, graded, returned
  score:        { type: DataTypes.FLOAT, allowNull: true },
  max_score:    { type: DataTypes.FLOAT, defaultValue: 100 },
  feedback:     { type: DataTypes.TEXT },
  reviewed_by:  { type: DataTypes.UUID, allowNull: true },
  reviewed_at:  { type: DataTypes.DATE, allowNull: true },
  due_date:     { type: DataTypes.DATE, allowNull: true },
  ai_feedback:  { type: DataTypes.TEXT },   // AI-generated feedback
  ai_score:     { type: DataTypes.FLOAT, allowNull: true },
}, {
  tableName: 'project_submissions', timestamps: true, underscored: true,
  getterMethods: {
    files() { try { return JSON.parse(this.files_json||'[]'); } catch { return []; } },
    links() { try { return JSON.parse(this.links_json||'[]'); } catch { return []; } }
  }
});
module.exports = ProjectSubmission;

'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ClassroomSubmission = sequelize.define('ClassroomSubmission', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  classroom_id:   { type: DataTypes.UUID, allowNull: false },
  author_id:      { type: DataTypes.UUID, allowNull: false },
  title:          { type: DataTypes.STRING(200) },
  code:           { type: DataTypes.TEXT },
  description:    { type: DataTypes.TEXT },
  file_urls:      { type: DataTypes.TEXT, defaultValue: '[]' },
  language:       { type: DataTypes.STRING(30) },
  status:         { type: DataTypes.STRING(20), defaultValue: 'submitted' },
  execution_result:{ type: DataTypes.TEXT, allowNull: true },
  ai_grade:       { type: DataTypes.INTEGER, allowNull: true },
  ai_feedback:    { type: DataTypes.TEXT, allowNull: true },
  mentor_grade:   { type: DataTypes.INTEGER, allowNull: true },
  mentor_feedback:{ type: DataTypes.TEXT, allowNull: true },
  graded_at:      { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'classroom_submissions', timestamps: true, underscored: true });

module.exports = ClassroomSubmission;

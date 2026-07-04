'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Classroom = sequelize.define('Classroom', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:   { type: DataTypes.UUID, allowNull: false },
  name:         { type: DataTypes.STRING(200), allowNull: false },
  description:  { type: DataTypes.TEXT },
  type:         { type: DataTypes.STRING(30), defaultValue: 'workspace' },
  status:       { type: DataTypes.STRING(20), defaultValue: 'active' },
  settings:     { type: DataTypes.TEXT, defaultValue: '{}' },
  created_by:   { type: DataTypes.UUID, allowNull: false },
  mentor_id:    { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'classrooms', timestamps: true, underscored: true });

module.exports = Classroom;

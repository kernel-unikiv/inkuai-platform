'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const MentorAssignment = sequelize.define('MentorAssignment', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:  { type: DataTypes.UUID, allowNull: false },
  mentor_id:   { type: DataTypes.UUID, allowNull: false },
  assigned_by: { type: DataTypes.STRING(20), defaultValue: 'auto' }, // 'auto' | 'admin'
  expertise:   { type: DataTypes.STRING(100) }, // area de expertise do mentor
  status:      { type: DataTypes.STRING(20), defaultValue: 'active' }, // active | completed | declined
  notes:       { type: DataTypes.TEXT },
}, {
  tableName: 'mentor_assignments', timestamps: true, underscored: true
});
module.exports = MentorAssignment;

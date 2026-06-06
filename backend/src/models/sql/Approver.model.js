'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Approver = sequelize.define('Approver', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  granted_by:   { type: DataTypes.UUID, allowNull: false }, // admin que concedeu
  scope:        { type: DataTypes.STRING(20), defaultValue: 'all' }, // 'all' | 'project' | 'startup'
  scope_id:     { type: DataTypes.UUID, defaultValue: null }, // ID específico ou null=todos
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'approvers', timestamps: true, underscored: true });

module.exports = Approver;

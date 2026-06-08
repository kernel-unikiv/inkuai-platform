'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Approver = sequelize.define('Approver', {
  id: {
    type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID, allowNull: false
  },
  granted_by: {
    type: DataTypes.UUID, allowNull: false
  },
  scope: {
    type: DataTypes.STRING(20), allowNull: true, defaultValue: 'all'
  },
  scope_id: {
    type: DataTypes.UUID, allowNull: true
    // SEM defaultValue: null
  },
  is_active: {
    type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true
  }
}, {
  tableName: 'approvers',
  timestamps: true,
  underscored: true
});

module.exports = Approver;

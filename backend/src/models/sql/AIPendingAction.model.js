'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AIPendingAction = sequelize.define('AIPendingAction', {
  id: {
    type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true
  },
  proposed_by: {
    type: DataTypes.STRING(20), allowNull: true, defaultValue: 'ai'
  },
  conversation_id: {
    type: DataTypes.UUID, allowNull: true
  },
  action_type: {
    type: DataTypes.STRING(50), allowNull: false
  },
  target_type: {
    type: DataTypes.STRING(20), allowNull: true
  },
  target_id: {
    type: DataTypes.UUID, allowNull: true
  },
  payload: {
    type: DataTypes.TEXT, allowNull: true, defaultValue: '{}'
  },
  reason: {
    type: DataTypes.TEXT, allowNull: true
  },
  status: {
    type: DataTypes.STRING(20), allowNull: true, defaultValue: 'pending'
  },
  // IMPORTANTE: reviewed_by sem defaultValue nem references aqui
  // A FK é definida nas relações do index.js
  reviewed_by: {
    type: DataTypes.UUID, allowNull: true
  },
  reviewed_at: {
    type: DataTypes.DATE, allowNull: true
  }
}, {
  tableName: 'ai_pending_actions',
  timestamps: true,
  underscored: true
});

module.exports = AIPendingAction;

'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AIPendingAction = sequelize.define('AIPendingAction', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  proposed_by:  { type: DataTypes.STRING(20), defaultValue: 'ai' },
  conversation_id: { type: DataTypes.UUID, defaultValue: null },
  action_type:  { type: DataTypes.STRING(50), allowNull: false },
  // 'approve_project'|'reject_project'|'advance_stage'|'send_notification'|'suspend_user'|'send_message'
  target_type:  { type: DataTypes.STRING(20) }, // 'project'|'startup'|'user'
  target_id:    { type: DataTypes.UUID },
  payload:      { type: DataTypes.TEXT, defaultValue: '{}' },
  // JSON com dados da acção
  reason:       { type: DataTypes.TEXT },
  // Justificação da IA
  status:       { type: DataTypes.STRING(20), defaultValue: 'pending' },
  // 'pending'|'approved'|'rejected'
  reviewed_by:  { type: DataTypes.UUID, defaultValue: null },
  reviewed_at:  { type: DataTypes.DATE, defaultValue: null }
}, { tableName: 'ai_pending_actions', timestamps: true, underscored: true });

module.exports = AIPendingAction;

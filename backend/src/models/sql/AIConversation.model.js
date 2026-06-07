'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AIConversation = sequelize.define('AIConversation', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:    { type: DataTypes.UUID, allowNull: false },
  context:    { type: DataTypes.STRING(20), defaultValue: 'general' },
  // 'admin_platform' | 'project_review' | 'startup_review' | 'general'
  context_id: { type: DataTypes.UUID, defaultValue: null },
  // ID do projecto ou startup se contexto específico
  title:      { type: DataTypes.STRING(200) },
  messages:   { type: DataTypes.TEXT, defaultValue: '[]' },
  // JSON array de {role:'user'|'assistant', content:'...', timestamp}
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'ai_conversations', timestamps: true, underscored: true });

module.exports = AIConversation;

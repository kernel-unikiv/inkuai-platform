'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AIConversation = sequelize.define('AIConversation', {
  id: {
    type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID, allowNull: false
  },
  context: {
    type: DataTypes.STRING(20), allowNull: true, defaultValue: 'general'
  },
  context_id: {
    type: DataTypes.UUID, allowNull: true
    // SEM defaultValue: null — deixar o Sequelize gerir
  },
  title: {
    type: DataTypes.STRING(200), allowNull: true
  },
  messages: {
    type: DataTypes.TEXT, allowNull: true, defaultValue: '[]'
  },
  is_active: {
    type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true
  }
}, {
  tableName: 'ai_conversations',
  timestamps: true,
  underscored: true
});

module.exports = AIConversation;

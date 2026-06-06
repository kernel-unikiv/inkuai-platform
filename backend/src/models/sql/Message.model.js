'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Message = sequelize.define('Message', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sender_id:   { type: DataTypes.UUID, allowNull: false },
  receiver_id: { type: DataTypes.UUID, allowNull: false },
  subject:     { type: DataTypes.STRING(200) },
  body:        { type: DataTypes.TEXT, allowNull: false },
  is_read:     { type: DataTypes.BOOLEAN, defaultValue: false },
  // contexto opcional (projecto ou startup)
  context_type:{ type: DataTypes.STRING(20) },  // 'project' | 'startup'
  context_id:  { type: DataTypes.UUID }
}, { tableName: 'messages', timestamps: true, underscored: true });

module.exports = Message;

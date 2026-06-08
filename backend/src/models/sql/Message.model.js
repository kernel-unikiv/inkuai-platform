'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true
  },
  sender_id: {
    type: DataTypes.UUID, allowNull: false
  },
  receiver_id: {
    type: DataTypes.UUID, allowNull: false
  },
  subject: {
    type: DataTypes.STRING(200), allowNull: true
  },
  body: {
    type: DataTypes.TEXT, allowNull: false
  },
  is_read: {
    type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false
  },
  context_type: {
    type: DataTypes.STRING(20), allowNull: true
  },
  context_id: {
    type: DataTypes.UUID, allowNull: true
  }
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true
});

module.exports = Message;

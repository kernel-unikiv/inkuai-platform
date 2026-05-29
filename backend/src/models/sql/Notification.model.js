'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Notification = sequelize.define('Notification', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:    { type: DataTypes.UUID, allowNull: false },
  type:       { type: DataTypes.STRING(20), defaultValue: 'info' },
  title:      { type: DataTypes.STRING(200), allowNull: false },
  message:    { type: DataTypes.TEXT },
  is_read:    { type: DataTypes.BOOLEAN, defaultValue: false },
  action_url: { type: DataTypes.STRING(500) }
}, { tableName: 'notifications', timestamps: true, underscored: true });
module.exports = Notification;

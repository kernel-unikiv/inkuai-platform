'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AdminAction = sequelize.define('AdminAction', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  admin_id:    { type: DataTypes.UUID, allowNull: false },
  action:      { type: DataTypes.STRING(50), allowNull: false },
  // Ex: 'delete_user', 'suspend_project', 'approve_startup', 'send_message'
  target_type: { type: DataTypes.STRING(20) }, // 'user' | 'project' | 'startup'
  target_id:   { type: DataTypes.UUID },
  details:     { type: DataTypes.TEXT }, // JSON string com detalhes
  ip_address:  { type: DataTypes.STRING(45) }
}, { tableName: 'admin_actions', timestamps: true, underscored: true });

module.exports = AdminAction;

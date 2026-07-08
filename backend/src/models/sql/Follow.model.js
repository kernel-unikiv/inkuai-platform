'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Follow = sequelize.define('Follow', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  follower_id: { type: DataTypes.UUID, allowNull: false },
  target_type: { type: DataTypes.STRING(20), defaultValue: 'user' }, // user|project|startup
  target_id:   { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'follows', timestamps: true, underscored: true });
module.exports = Follow;

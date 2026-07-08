'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Comment = sequelize.define('Comment', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  author_id:   { type: DataTypes.UUID, allowNull: false },
  target_type: { type: DataTypes.STRING(30), allowNull: false }, // project|article|startup|submission
  target_id:   { type: DataTypes.UUID, allowNull: false },
  parent_id:   { type: DataTypes.UUID, allowNull: true },  // resposta a outro comentário
  body:        { type: DataTypes.TEXT, allowNull: false },
  likes:       { type: DataTypes.INTEGER, defaultValue: 0 },
  is_pinned:   { type: DataTypes.BOOLEAN, defaultValue: false },
  is_deleted:  { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'comments', timestamps: true, underscored: true });
module.exports = Comment;

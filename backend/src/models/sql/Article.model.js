'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Article = sequelize.define('Article', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  author_id:   { type: DataTypes.UUID, allowNull: false },
  title:       { type: DataTypes.STRING(300), allowNull: false },
  summary:     { type: DataTypes.TEXT },
  body:        { type: DataTypes.TEXT, allowNull: false },
  type:        { type: DataTypes.STRING(20), defaultValue: 'article' },
  tags:        { type: DataTypes.TEXT, defaultValue: '[]' },
  status:      { type: DataTypes.STRING(20), defaultValue: 'draft' },
  views:       { type: DataTypes.INTEGER, defaultValue: 0 },
  likes:       { type: DataTypes.INTEGER, defaultValue: 0 },
  project_id:  { type: DataTypes.UUID, allowNull: true },
  ai_summary:  { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'articles', timestamps: true, underscored: true });

module.exports = Article;

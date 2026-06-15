'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Article = sequelize.define('Article', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:       { type: DataTypes.STRING(300), allowNull: false },
  content:     { type: DataTypes.TEXT, allowNull: false },
  summary:     { type: DataTypes.TEXT },
  author_id:   { type: DataTypes.UUID, allowNull: false },
  project_id:  { type: DataTypes.UUID, allowNull: true },
  category:    { type: DataTypes.STRING(50), defaultValue: 'ideia' }, // ideia, artigo, investigacao, inovacao
  tags_json:   { type: DataTypes.TEXT, defaultValue: '[]' },
  status:      { type: DataTypes.STRING(20), defaultValue: 'published' },
  views:       { type: DataTypes.INTEGER, defaultValue: 0 },
  likes:       { type: DataTypes.INTEGER, defaultValue: 0 },
  cover_url:   { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'articles', timestamps: true, underscored: true,
  getterMethods: {
    tags() { try { return JSON.parse(this.tags_json||'[]'); } catch { return []; } }
  },
  setterMethods: {
    tags(v) { this.setDataValue('tags_json', JSON.stringify(v||[])); }
  }
});
module.exports = Article;

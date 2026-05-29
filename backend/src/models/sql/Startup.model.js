'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Startup = sequelize.define('Startup', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(150), allowNull: false },
  slug:        { type: DataTypes.STRING(100), unique: true },
  description: { type: DataTypes.TEXT },
  owner_id:    { type: DataTypes.UUID, allowNull: false },
  sector:      { type: DataTypes.STRING(100), defaultValue: 'IA/Software' },
  status:      { type: DataTypes.STRING(20), defaultValue: 'draft' },
  github_url:  { type: DataTypes.STRING(500) },
  logo_url:    { type: DataTypes.STRING(500) },
  website_url: { type: DataTypes.STRING(500) },
  tags_json:   { type: DataTypes.TEXT, defaultValue: '[]' }
}, {
  tableName: 'startups', timestamps: true, underscored: true,
  getterMethods: { tags() { try { return JSON.parse(this.tags_json||'[]'); } catch { return []; } } },
  setterMethods: { tags(v) { this.setDataValue('tags_json', JSON.stringify(v||[])); } }
});
module.exports = Startup;

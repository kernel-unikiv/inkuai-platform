'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const MediaLibrary = sequelize.define('MediaLibrary', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  owner_id:    { type: DataTypes.UUID, allowNull: false },
  project_id:  { type: DataTypes.UUID, allowNull: true },
  name:        { type: DataTypes.STRING(300), allowNull: false },
  type:        { type: DataTypes.STRING(20), defaultValue: 'file' },
  // file|image|video|audio|document|link
  url:         { type: DataTypes.TEXT, allowNull: false },
  thumbnail_url:{ type: DataTypes.TEXT },
  size_bytes:  { type: DataTypes.BIGINT, defaultValue: 0 },
  mime_type:   { type: DataTypes.STRING(100) },
  description: { type: DataTypes.TEXT },
  tags_json:   { type: DataTypes.TEXT, defaultValue: '[]' },
  is_public:   { type: DataTypes.BOOLEAN, defaultValue: false },
  downloads:   { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'media_library', timestamps: true, underscored: true });
module.exports = MediaLibrary;

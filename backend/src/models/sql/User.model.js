'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  email:        { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash:{ type: DataTypes.STRING(255), allowNull: false },
  role:         { type: DataTypes.STRING(20), defaultValue: 'student' },
  avatar_url:   { type: DataTypes.STRING(500), defaultValue: null },
  bio:          { type: DataTypes.TEXT, defaultValue: null },
  github_username:{ type: DataTypes.STRING(100), defaultValue: null },
  orcid_id:     { type: DataTypes.STRING(50), defaultValue: null },
  institution:  { type: DataTypes.STRING(200), defaultValue: 'IP/UNIKIVI' },
  expertise_areas: { type: DataTypes.TEXT, defaultValue: '[]' }, // JSON array: ['software','ia','dados']
  mentor_bio:   { type: DataTypes.TEXT, defaultValue: null },  // bio específica como mentor
  is_verified:  { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login:   { type: DataTypes.DATE, defaultValue: null },
  reset_token:  { type: DataTypes.STRING(255), defaultValue: null },
  reset_token_expires: { type: DataTypes.DATE, defaultValue: null }
}, {
  tableName: 'users', timestamps: true, underscored: true,
  defaultScope: { attributes: { exclude: ['password_hash','reset_token','reset_token_expires'] } },
  scopes: { withPassword: { attributes: {} } }
});

User.beforeCreate(async (user) => {
  if (user.password_hash) user.password_hash = await bcrypt.hash(user.password_hash, 12);
});
User.beforeUpdate(async (user) => {
  if (user.changed('password_hash')) user.password_hash = await bcrypt.hash(user.password_hash, 12);
});
User.prototype.verifyPassword = async function(candidate) {
  const u = await User.scope('withPassword').findByPk(this.id);
  return bcrypt.compare(candidate, u.password_hash);
};
User.prototype.toPublicJSON = function() {
  return { id:this.id, name:this.name, email:this.email, role:this.role,
    avatar_url:this.avatar_url, bio:this.bio, github_username:this.github_username,
    orcid_id:this.orcid_id, institution:this.institution, is_verified:this.is_verified,
    is_active:this.is_active, created_at:this.created_at };
};
module.exports = User;

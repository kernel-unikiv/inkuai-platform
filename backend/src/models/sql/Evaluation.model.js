'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const Evaluation = sequelize.define('Evaluation', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:   { type: DataTypes.UUID, allowNull: false },
  evaluator_id: { type: DataTypes.UUID, allowNull: false },
  score:        { type: DataTypes.INTEGER },
  feedback:     { type: DataTypes.TEXT },
  status:       { type: DataTypes.STRING(20), defaultValue: 'pending' }
}, { tableName: 'evaluations', timestamps: true, underscored: true });
module.exports = Evaluation;

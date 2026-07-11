'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Evaluation = sequelize.define('Evaluation', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  project_id:   { type: DataTypes.UUID, allowNull: false },
  evaluator_id: { type: DataTypes.UUID, allowNull: false },
  stars:        { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 5 } },
  score:        { type: DataTypes.FLOAT },
  feedback:     { type: DataTypes.TEXT },
  status:       { type: DataTypes.STRING(20), defaultValue: 'submitted' },
  // Critérios de avaliação detalhados
  innovation_score:   { type: DataTypes.INTEGER, defaultValue: 0 },
  viability_score:    { type: DataTypes.INTEGER, defaultValue: 0 },
  impact_score:       { type: DataTypes.INTEGER, defaultValue: 0 },
  presentation_score: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'evaluations',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['project_id', 'evaluator_id'], name: 'unique_project_evaluator' }
  ]
});

module.exports = Evaluation;

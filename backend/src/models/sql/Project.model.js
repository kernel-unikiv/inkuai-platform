"use strict";
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    startup_id: { type: DataTypes.UUID, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(30), defaultValue: "software" },
    status: { type: DataTypes.STRING(30), defaultValue: "draft" },
    github_repo_url: { type: DataTypes.STRING(500) },
    github_repo_id: { type: DataTypes.STRING(50) },
    tech_stack_json: { type: DataTypes.TEXT, defaultValue: "[]" },
    tags_json: { type: DataTypes.TEXT, defaultValue: "[]" },
    version: { type: DataTypes.STRING(20), defaultValue: "1.0.0" },
    is_public: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "projects",
    timestamps: true,
    underscored: true,
    getterMethods: {
      tech_stack() {
        try {
          return JSON.parse(this.tech_stack_json || "[]");
        } catch {
          return [];
        }
      },
      tags() {
        try {
          return JSON.parse(this.tags_json || "[]");
        } catch {
          return [];
        }
      },
    },
    setterMethods: {
      tech_stack(v) {
        this.setDataValue("tech_stack_json", JSON.stringify(v || []));
      },
      tags(v) {
        this.setDataValue("tags_json", JSON.stringify(v || []));
      },
    },
  },
);
module.exports = Project;

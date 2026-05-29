"use strict";
require("dotenv").config();
const { Sequelize } = require("sequelize");
const path = require("path");
const logger = require("../utils/logger");

const DATABASE_URL = process.env.DATABASE_URL || "";
const isPostgres =
  DATABASE_URL.startsWith("postgresql") || DATABASE_URL.startsWith("postgres");

let sequelize;

if (isPostgres) {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? { require: true, rejectUnauthorized: false }
          : false,
    },
    logging: (sql) => console.log("[SQL]", sql),
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  });
  logger.info("📦 PostgreSQL configurado");
} else {
  // SQLite fallback (desenvolvimento ou quando DATABASE_URL não está definido)
  const dbPath =
    process.env.NODE_ENV === "production"
      ? "/tmp/inkuai.sqlite" // Render oferece /tmp para dados temporários
      : path.join(__dirname, "../../logs/inkuai.sqlite");

  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
  });
  logger.warn(`⚠️  DATABASE_URL não definido — usando SQLite em ${dbPath}`);
  logger.warn(
    "    Configure Supabase (supabase.com) e defina DATABASE_URL em produção",
  );
}

module.exports = { sequelize, Sequelize };

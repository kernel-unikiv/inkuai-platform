'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgres = DATABASE_URL.startsWith('postgresql') || DATABASE_URL.startsWith('postgres');

let sequelize;

if (isPostgres) {
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production'
        ? { require: true, rejectUnauthorized: false }
        : false
    },
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  });
  logger.info('📦 PostgreSQL configurado');
} else {
  // Usar sequelize em memória (dialect: sqlite em memória puro JS via sequelize)
  // A versão do sequelize inclui um dialect "abstract" que podemos usar
  // Mas a forma mais simples é usar o dialecto postgres apontando para
  // uma string que vai falhar graciosamente no authenticate()
  sequelize = new Sequelize('inkuai', 'admin', 'pass', {
    host: '127.0.0.1',
    port: 54320,
    dialect: 'postgres',
    logging: false,
    pool: { max: 1, min: 0, acquire: 2000, idle: 1000 }
  });
  logger.warn('⚠️  DATABASE_URL não definido — configure o Supabase gratuito (supabase.com)');
}

module.exports = { sequelize, Sequelize };

'use strict';
require('dotenv').config();
const logger = require('../utils/logger');

let mongoConnected = false;

const connectMongoDB = async () => {
  const uri = process.env.MONGODB_URI;
  
  if (!uri || uri === 'OPTIONAL') {
    logger.info('📦 MongoDB: modo in-memory (sem MONGODB_URI configurado)');
    global._inMemoryDB = {
      executions: [], datasets: [], metrics: [], logs: []
    };
    return;
  }

  try {
    const mongoose = require('mongoose');
    mongoose.connection.on('connected', () => {
      mongoConnected = true;
      logger.info('📦 MongoDB Atlas conectado');
    });
    mongoose.connection.on('error', (err) => logger.warn('MongoDB warning:', err.message));
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    logger.warn('⚠️  MongoDB não disponível — usando in-memory. Dados de execução não persistidos.');
    global._inMemoryDB = { executions: [], datasets: [], metrics: [], logs: [] };
  }
};

module.exports = connectMongoDB;

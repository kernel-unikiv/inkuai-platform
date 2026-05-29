'use strict';
const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  let { statusCode = 500, message, errors } = err;

  if (err.name === 'SequelizeValidationError') {
    statusCode = 422;
    message = 'Erro de validação na base de dados';
    errors = err.errors.map(e => ({ field: e.path, message: e.message }));
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Registo duplicado. Já existe um registo com estes dados.';
  }

  if (statusCode >= 500) logger.error(`[${req.method}] ${req.path} — ${err.message}`, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    timestamp: new Date().toISOString(),
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorMiddleware;

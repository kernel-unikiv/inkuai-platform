'use strict';
const { AppError } = require('../utils/apiResponse');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Autenticação necessária.', 401));
  if (!allowedRoles.includes(req.user.role))
    return next(new AppError(`Acesso negado. Roles: ${allowedRoles.join(', ')}`, 403));
  next();
};

const authorizeOwnerOrAdmin = (req, res, next) => {
  const { id } = req.params;
  if (req.user.role === 'admin' || req.user.id === id) return next();
  return next(new AppError('Sem permissão para este recurso.', 403));
};

module.exports = { authorize, authorizeOwnerOrAdmin };

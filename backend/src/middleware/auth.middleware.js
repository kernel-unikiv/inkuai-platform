'use strict';
const jwt = require('jsonwebtoken');
const { User } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const jwtConfig = require('../config/jwt');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticação não fornecido.', 401);
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try { decoded = jwt.verify(token, jwtConfig.secret); }
    catch (e) {
      throw new AppError(
        e.name === 'TokenExpiredError' ? 'Token expirado. Faça login novamente.' : 'Token inválido.',
        401
      );
    }
    const user = await User.findByPk(decoded.id);
    if (!user) throw new AppError('Utilizador não encontrado.', 401);
    if (!user.is_active) throw new AppError('Conta desactivada.', 403);
    req.user = user;
    req.token = token;
    next();
  } catch (error) { next(error); }
};

module.exports = { authenticate };

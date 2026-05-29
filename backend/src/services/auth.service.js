'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

class AuthService {
  async register({ name, email, password, role='student', institution }) {
    const existing = await User.findOne({ where:{ email } });
    if (existing) throw new AppError('Este email já está registado.', 409);
    if (!['student','researcher'].includes(role)) throw new AppError('Role inválido.', 400);
    const user = await User.create({
      name, email, password_hash: password,
      role, institution: institution||'IP/UNIKIVI'
    });
    return { user: user.toPublicJSON() };
  }

  async login(email, password, ipAddress) {
    const user = await User.scope('withPassword').findOne({ where:{ email } });
    if (!user) throw new AppError('Credenciais inválidas.', 401);
    if (!user.is_active) throw new AppError('Conta desactivada.', 403);
    const valid = await user.verifyPassword(password);
    if (!valid) throw new AppError('Credenciais inválidas.', 401);
    await user.update({ last_login: new Date() });
    const token = this._accessToken(user);
    const refreshToken = this._refreshToken(user);
    logger.info(`Login: ${email} | IP: ${ipAddress}`);
    return { token, refreshToken, user: user.toPublicJSON() };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) throw new AppError('Token inválido.', 401);
      return { token: this._accessToken(user) };
    } catch {
      throw new AppError('Token inválido ou expirado.', 401);
    }
  }

  async forgotPassword(email) {
    const user = await User.findOne({ where:{ email } });
    if (!user) return; // silêncio por segurança
    const token = crypto.randomBytes(32).toString('hex');
    await user.update({ reset_token: token, reset_token_expires: new Date(Date.now()+3600000) });
    logger.info(`Password reset para: ${email} | Token: ${token}`);
    // Em produção enviar email — aqui só log
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({ where:{ reset_token: token } });
    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date())
      throw new AppError('Token inválido ou expirado.', 400);
    await user.update({ password_hash: newPassword, reset_token: null, reset_token_expires: null });
  }

  async verifyEmail(token) {
    const user = await User.findOne({ where:{ reset_token: token } });
    if (!user) throw new AppError('Token inválido.', 400);
    await user.update({ is_verified: true, reset_token: null });
  }

  async getProfile(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);
    return user.toPublicJSON();
  }

  _accessToken(user) {
    return jwt.sign(
      { id:user.id, email:user.email, role:user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }
  _refreshToken(user) {
    return jwt.sign({ id:user.id }, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn });
  }
}

module.exports = new AuthService();

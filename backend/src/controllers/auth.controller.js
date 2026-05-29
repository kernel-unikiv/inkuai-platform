'use strict';
const authService = require('../services/auth.service');
const { ApiResponse } = require('../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.success(res, { message: 'Conta criada com sucesso!', user: result.user }, 201);
    } catch (e) { next(e); }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, req.ip);
      return ApiResponse.success(res, { message: 'Login realizado com sucesso', ...result, expiresIn: '7d' });
    } catch (e) { next(e); }
  }

  async logout(req, res, next) {
    try {
      return ApiResponse.success(res, { message: 'Sessão encerrada com sucesso' });
    } catch (e) { next(e); }
  }

  async refreshToken(req, res, next) {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      return ApiResponse.success(res, result);
    } catch (e) { next(e); }
  }

  async forgotPassword(req, res, next) {
    try {
      await authService.forgotPassword(req.body.email);
      return ApiResponse.success(res, { message: 'Se o email existir, receberá as instruções em breve.' });
    } catch (e) { next(e); }
  }

  async resetPassword(req, res, next) {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      return ApiResponse.success(res, { message: 'Password redefinida com sucesso.' });
    } catch (e) { next(e); }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return ApiResponse.success(res, { user });
    } catch (e) { next(e); }
  }

  async verifyEmail(req, res, next) {
    try {
      await authService.verifyEmail(req.params.token);
      return ApiResponse.success(res, { message: 'Email verificado com sucesso!' });
    } catch (e) { next(e); }
  }
}

module.exports = new AuthController();

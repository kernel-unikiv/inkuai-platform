'use strict';
const Joi = require('joi');

module.exports = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({ 'any.required': 'Nome obrigatório' }),
    email: Joi.string().email().required().messages({ 'any.required': 'Email obrigatório' }),
    password: Joi.string().min(8).max(100).required().messages({
      'string.min': 'Password com mínimo 8 caracteres', 'any.required': 'Password obrigatória'
    }),
    role: Joi.string().valid('student','researcher').default('student'),
    institution: Joi.string().max(200).default('IP/UNIKIVI')
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  forgotPassword: Joi.object({ email: Joi.string().email().required() }),
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),
  refreshToken: Joi.object({ refreshToken: Joi.string().required() })
};

'use strict';
const Joi = require('joi');

module.exports = {
  execute: Joi.object({
    code: Joi.string().min(1).max(50000).required().messages({ 'any.required': 'Código obrigatório' }),
    project_id: Joi.string().uuid().required(),
    type: Joi.string().valid('python','ai_training','test').default('python')
  })
};

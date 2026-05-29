'use strict';
const Joi = require('joi');

module.exports = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().max(5000).required(),
    startup_id: Joi.string().uuid().allow(null),
    type: Joi.string().valid('software','ai_model','data_pipeline','research').default('software'),
    github_repo_url: Joi.string().uri().allow('', null),
    tech_stack: Joi.array().items(Joi.string()).default([]),
    tags: Joi.array().items(Joi.string()).default([]),
    is_public: Joi.boolean().default(false)
  }),
  update: Joi.object({
    title: Joi.string().min(5).max(200),
    description: Joi.string().max(5000),
    status: Joi.string().valid('draft','submitted','in_progress'),
    github_repo_url: Joi.string().uri().allow('', null),
    tech_stack: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    is_public: Joi.boolean(),
    version: Joi.string().max(20)
  })
};

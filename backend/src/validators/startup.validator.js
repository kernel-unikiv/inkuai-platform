'use strict';
const Joi = require('joi');

module.exports = {
  create: Joi.object({
    name: Joi.string().min(3).max(150).required(),
    description: Joi.string().max(2000).required(),
    sector: Joi.string().max(100).default('IA/Software'),
    github_url: Joi.string().uri().allow('', null),
    website_url: Joi.string().uri().allow('', null),
    tags: Joi.array().items(Joi.string()).default([])
  }),
  update: Joi.object({
    name: Joi.string().min(3).max(150),
    description: Joi.string().max(2000),
    sector: Joi.string().max(100),
    status: Joi.string().valid('draft','active','paused'),
    github_url: Joi.string().uri().allow('', null),
    website_url: Joi.string().uri().allow('', null),
    tags: Joi.array().items(Joi.string())
  })
};

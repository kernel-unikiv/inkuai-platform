'use strict';
const { AppError } = require('../utils/apiResponse');

const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    return next(new AppError('Dados inválidos.', 422, errors));
  }
  req.body = value;
  next();
};

module.exports = { validateBody };

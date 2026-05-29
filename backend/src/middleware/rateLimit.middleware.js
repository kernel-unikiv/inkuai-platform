'use strict';
const rateLimit = require('express-rate-limit');

const msg = (m) => ({ success: false, message: m });

const global = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: msg('Demasiados pedidos. Tente em 15 minutos.'),
  standardHeaders: true, legacyHeaders: false
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: msg('Demasiadas tentativas de login. Tente em 15 minutos.'),
  skipSuccessfulRequests: true
});

const sandbox = rateLimit({
  windowMs: 60 * 1000, max: 5,
  message: msg('Limite de execuções atingido. Aguarde 1 minuto.')
});

module.exports = { global, auth, sandbox };

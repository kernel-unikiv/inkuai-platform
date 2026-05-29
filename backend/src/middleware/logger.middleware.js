'use strict';
const logger = require('../utils/logger');
module.exports = { stream: { write: (msg) => logger.info(msg.trim()) } };

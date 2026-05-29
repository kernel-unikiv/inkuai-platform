'use strict';
require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'inkuai-dev-secret-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'inkuai-refresh-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: '30d'
};

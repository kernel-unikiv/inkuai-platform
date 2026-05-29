'use strict';
const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user_id: { type: String, index: true },
  action: String,
  resource: String,
  resource_id: String,
  ip_address: String,
  user_agent: String,
  metadata: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now, index: true, expires: '90d' }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

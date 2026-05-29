'use strict';
const mongoose = require('mongoose');

const ExecutionSchema = new mongoose.Schema({
  project_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  execution_type: { type: String, enum: ['python','ai_training','test'], default: 'python' },
  code_snapshot: { type: String, maxlength: 100000 },
  status: { type: String, enum: ['queued','running','completed','failed','timeout'], default: 'queued', index: true },
  container_id: String,
  stdout: { type: String, maxlength: 50000 },
  stderr: { type: String, maxlength: 10000 },
  exit_code: Number,
  execution_time_ms: Number,
  memory_used_mb: Number,
  created_at: { type: Date, default: Date.now, index: true },
  completed_at: Date
});

module.exports = mongoose.model('Execution', ExecutionSchema);

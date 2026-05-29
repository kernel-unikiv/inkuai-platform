'use strict';
const mongoose = require('mongoose');

const DatasetSchema = new mongoose.Schema({
  project_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  file_url: String,
  file_size_bytes: Number,
  format: { type: String, enum: ['csv','json','parquet','images','text'], default: 'csv' },
  rows: Number,
  columns: Number,
  schema_info: mongoose.Schema.Types.Mixed,
  tags: [String],
  is_public: { type: Boolean, default: false },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dataset', DatasetSchema);

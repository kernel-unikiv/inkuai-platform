'use strict';
const mongoose = require('mongoose');

const AIMetricSchema = new mongoose.Schema({
  project_id: { type: String, required: true, index: true },
  model_name: String,
  model_type: { type: String, enum: ['classification','regression','nlp','cv','other'] },
  training_run_id: String,
  metrics: {
    accuracy: Number, precision: Number, recall: Number,
    f1_score: Number, loss: Number, val_loss: Number,
    custom: mongoose.Schema.Types.Mixed
  },
  hyperparameters: mongoose.Schema.Types.Mixed,
  epoch: Number,
  dataset_id: String,
  recorded_at: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AIMetric', AIMetricSchema);

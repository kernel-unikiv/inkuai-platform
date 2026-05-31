'use strict';

require('dotenv').config();
const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const path     = require('path');

const routes          = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');
const rateLimitMiddleware = require('./middleware/rateLimit.middleware');

const app = express();

// ── Segurança ─────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));
app.use(rateLimitMiddleware.global);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(compression());
app.use(morgan('dev'));

// ── Ficheiros estáticos ───────────────────────────────
// frontend/public é servido na raiz /
// backend/src/app.js → __dirname = .../backend/src
// ../../frontend/public = .../frontend/public
const frontendPath = path.join(__dirname, '../../frontend/public');
app.use(express.static(frontendPath));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API ───────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Health check ──────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'INKU·AI',
    institution: 'IP/UNIKIVI',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── SPA Fallback: qualquer rota desconhecida → index.html ──
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath);
  }
});

// ── Global error handler ──────────────────────────────
app.use(errorMiddleware);

module.exports = app;

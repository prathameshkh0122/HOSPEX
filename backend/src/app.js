const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501').split(',').map((origin) => origin.trim());
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('This website origin is not allowed by CORS.'));
} }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.get('/api/v1/health', (_req, res) => res.json({ success: true, message: 'HOSPEX API is running.' }));
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), require('./routes/authRoutes'));
app.use('/api/v1/resources', require('./routes/resourceRoutes'));
app.use('/api/v1/requests', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }), require('./routes/requestRoutes'));
app.use('/api/v1/stats', require('./routes/statsRoutes'));

// Serve the existing static frontend without exposing backend source files.
const frontend = path.join(__dirname, '..', '..');
app.get('/', (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
app.get('/style.css', (_req, res) => res.sendFile(path.join(frontend, 'style.css')));
app.get('/script.js', (_req, res) => res.sendFile(path.join(frontend, 'script.js')));
app.use(notFound);
app.use(errorHandler);

module.exports = app;

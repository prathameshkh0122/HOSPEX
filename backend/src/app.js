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
app.use('/api/v1/business', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }), require('./routes/businessRoutes'));
app.use('/api/v1/admin', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), require('./routes/adminRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));

// Uploaded business documents (license/QR). Filenames are random and
// unguessable; this directory holds nothing but those uploads.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { dotfiles: 'deny', index: false }));

// Serve the existing static frontend without exposing backend source files
// (the backend/ folder, .env, .git, etc. all live one level up from here).
const frontend = path.join(__dirname, '..', '..');
const BLOCKED_PREFIXES = ['/backend', '/.git', '/.env'];
app.use((req, res, next) => {
  const lowerPath = req.path.toLowerCase();
  if (BLOCKED_PREFIXES.some((prefix) => lowerPath.startsWith(prefix)) || lowerPath.includes('/..')) {
    return notFound(req, res);
  }
  next();
});
app.use(express.static(frontend, { dotfiles: 'deny', index: 'index.html', extensions: ['html'] }));
app.use(notFound);
app.use(errorHandler);

module.exports = app;

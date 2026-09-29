// ═══════════════════════════════════════════
// SERVER.JS — Advertisement Optimiser Backend
// ═══════════════════════════════════════════
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes     = require('./routes/authRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const adminRoutes    = require('./routes/adminRoutes');

const app = express();

// ── Security headers ──────────────────────
app.use(helmet());

// ── CORS — only allow configured frontend ─
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true   // Required for cookies
}));

// ── Body parsers ──────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit:    100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' }
});

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit:    10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

app.use(limiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Routes ────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin',     adminRoutes);

// ── Health check ──────────────────────────
app.get('/', (req, res) => {
  res.json({
    message:     'Advertisement Optimiser API is running',
    version:     '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp:   new Date().toISOString()
  });
});

// ── 404 handler ───────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ── Global error handler ──────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

// ── Start server ──────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend allowed: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});

module.exports = app;

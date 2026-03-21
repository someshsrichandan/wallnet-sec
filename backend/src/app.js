const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const createRateLimiter = require('./middlewares/rateLimiter');
const requestContext = require('./middlewares/requestContext');
const securityHeaders = require('./middlewares/securityHeaders');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

// Global middleware
app.use(requestContext);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed for this origin'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: env.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: env.jsonLimit }));
app.use(createRateLimiter({ windowMs: 60_000, max: 240 }));
app.use('/api/visual-password', createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'vp' }));
app.use('/api/submissions', createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'submission' }));

// Simple liveliness check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// API routes
app.use('/api', routes);

// Fallbacks
app.use(notFound);
app.use(errorHandler);

module.exports = app;

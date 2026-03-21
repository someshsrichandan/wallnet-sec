// Vercel serverless entry point for the Express backend.
// Vercel injects env vars directly — dotenv is a no-op in production but harmless.
require('dotenv').config();

const app = require('../src/app');
const { connectDB } = require('../src/config/db');

// Reuse the connection across warm Lambda invocations.
// If the connection drops, the next request will reconnect.
let connectionPromise = null;

const ensureConnected = () => {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((err) => {
      // Reset so the next request retries
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
};

module.exports = async (req, res) => {
  await ensureConnected();
  return app(req, res);
};

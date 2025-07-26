const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';  // 30 days instead of 1 hour
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '90d'; // 90 days instead of 7 days

// Generate access token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

// Generate webhook token for partners
const generateWebhookToken = (partnerId) => {
  return jwt.sign({ id: partnerId }, JWT_SECRET, { expiresIn: '30d' });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateWebhookToken
};
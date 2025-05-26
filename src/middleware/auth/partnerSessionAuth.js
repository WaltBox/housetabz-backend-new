// src/middleware/auth/partnerSessionAuth.js
const jwt = require('jsonwebtoken');
const { Partner } = require('../../models');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticatePartnerSession = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check for required claims
    if (!decoded.id) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid session token'
      });
    }
    
    // Find partner
    const partner = await Partner.findByPk(decoded.id);
    if (!partner) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Partner account not found'
      });
    }
    
    // Attach partner to request for dashboard routes
    req.current_partner = partner;
    // Also set webhookPartner for compatibility with existing methods
    req.webhookPartner = partner;
    next();
  } catch (error) {
    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Session expired',
        message: 'Please log in again' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid session token' 
      });
    }
    
    // Log error but don't expose details
    console.error('Partner session authentication error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
};

module.exports = { authenticatePartnerSession };
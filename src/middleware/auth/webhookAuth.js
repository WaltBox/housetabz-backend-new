const jwt = require('jsonwebtoken');
const { Partner } = require('../../models');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateWebhook = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Valid webhook token required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check for required claims
    if (!decoded.id) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid token format'
      });
    }
    
    // Find partner
    const partner = await Partner.findByPk(decoded.id);
    if (!partner) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Partner not found'
      });
    }
    
    // Attach partner to request
    req.webhookPartner = partner;
    next();
  } catch (error) {
    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Webhook token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid webhook token' 
      });
    }
    
    // Log error but don't expose details
    console.error('Webhook authentication error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
};

module.exports = { authenticateWebhook };
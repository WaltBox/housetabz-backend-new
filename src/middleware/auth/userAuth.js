const jwt = require('jsonwebtoken');
const { User } = require('../../models');

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateUser = async (req, res, next) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Valid authentication token required' 
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user exists and is active
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'User not found' 
      });
    }
    
    // Add user to request object for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid token' 
      });
    }
    
    // Log unexpected errors but don't expose details
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
};

module.exports = { authenticateUser };
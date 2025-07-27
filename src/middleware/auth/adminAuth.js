// middleware/auth/adminAuth.js
const jwt = require('jsonwebtoken');
const { Admin } = require('../../models');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateAdmin = async (req, res, next) => {

  
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

    // Check if token type is admin (but don't require it)
    if (decoded.type && decoded.type !== 'admin') {
    
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin token required'
      });
    }

    // Find admin and verify they exist and are active
    const admin = await Admin.findByPk(decoded.id);
  

    if (!admin) {
   
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Admin not found'
      });
    }

    if (!admin.isActive) {
     
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Admin account inactive'
      });
    }

    // Add admin to request object (following partner pattern)
    req.current_admin = admin;
    req.isAdminRequest = true;

    next();

  } catch (error) {
    
    
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

    console.error('Unexpected admin authentication error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
};

module.exports = { authenticateAdmin };
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { 
    error: 'Too many requests', 
    message: 'Please try again later' 
  }
});

// More strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Too many login attempts', 
    message: 'Please try again later' 
  }
});

// Rate limiter specifically for partner API endpoints
const partnerApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Higher limit for partner APIs
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Rate limit exceeded', 
    message: 'Too many requests, please try again later' 
  }
});
// Add this middleware function to your file
const blockPaths = (req, res, next) => {
    const blockedPaths = ['/admin', '/config', '/default.html', '/info_deviceStatus.html'];
    if (blockedPaths.includes(req.path)) {
      console.log(`Blocked access to path: ${req.path} from IP: ${req.ip}`);
      return res.status(403).json({ message: 'Access denied.' });
    }
    next();
  };
  
  // Update the exports to include blockPaths
  module.exports = {
    apiLimiter,
    authLimiter,
    partnerApiLimiter,
    blockPaths
  };

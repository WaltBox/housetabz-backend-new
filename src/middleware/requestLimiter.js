const rateLimit = require('express-rate-limit');

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 750, // Increase to 100 requests per window if appropriate
  message: { message: 'Too many requests, please try again later.' },
});

// Middleware to block specific paths
const blockPaths = (req, res, next) => {
  const blockedPaths = ['/admin', '/config', '/default.html', '/info_deviceStatus.html'];
  if (blockedPaths.includes(req.path)) {
    console.log(`Blocked access to path: ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ message: 'Access denied.' });
  }
  next();
};

module.exports = { limiter, blockPaths };

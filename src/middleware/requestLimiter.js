const rateLimit = require('express-rate-limit');

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 100 requests per window
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

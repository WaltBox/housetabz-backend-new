// src/middleware/auth/systemAuth.js
module.exports.authenticateSystem = (req, res, next) => {
    const key = req.headers['x-housetabz-service-key'];
    if (key !== process.env.SYSTEM_API_KEY) {
      return res.status(401).json({ error: 'Invalid service key' });
    }
    next();
  };
  
// middleware/webhookMiddleware.js
const jwt = require('jsonwebtoken');
const { Partner } = require('../models');

const webhookMiddleware = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        console.log('Authorization header is missing');
        return res.status(401).json({ error: 'Authorization header missing' });
      }
  
      const token = authHeader.split(' ')[1];
      if (!token) {
        console.log('Token is missing');
        return res.status(401).json({ error: 'Token missing' });
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
  
      const partner = await Partner.findByPk(decoded.id);
      if (!partner) {
        console.log(`Partner with id ${decoded.id} not found`);
        return res.status(404).json({ error: 'Partner not found' });
      }
  
      req.webhookPartner = partner;
      next();
    } catch (error) {
      console.error('Webhook middleware error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
  

module.exports = webhookMiddleware;
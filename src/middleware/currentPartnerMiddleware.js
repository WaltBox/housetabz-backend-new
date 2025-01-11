const jwt = require('jsonwebtoken');
const { Partner } = require('../models');

const currentPartnerMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('No Authorization header provided');
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token payload:', decoded);

    if (!decoded.id || isNaN(decoded.id)) {
      console.error('Invalid or missing partner ID in token:', decoded.id);
      return res.status(400).json({ error: 'Invalid partner ID' });
    }

    const partnerId = parseInt(decoded.id, 10);
    console.log('Resolved partner ID:', partnerId);

    const partner = await Partner.findOne({ where: { id: partnerId } });
    if (!partner) {
      console.error('Partner not found for ID:', partnerId);
      return res.status(404).json({ error: 'Partner not found' });
    }

    req.current_partner = partner;
    next();
  } catch (error) {
    console.error('Error in currentPartnerMiddleware:', error.message, error.stack);
    return res.status(500).json({ error: 'Failed to authenticate partner' });
  }
};

module.exports = currentPartnerMiddleware;

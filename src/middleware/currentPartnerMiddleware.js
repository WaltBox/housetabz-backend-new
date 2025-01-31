const jwt = require('jsonwebtoken');
const { Partner } = require('../models');

const currentPartnerMiddleware = async (req, res, next) => {
  console.log('⭐ Starting currentPartnerMiddleware');
  console.log('Request headers:', req.headers);
  
  try {
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);

    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      return res.status(401).json({ 
        error: 'Authorization token missing',
        debug: 'No Authorization header found in request'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token);

    // First try to decode without verification to see the payload
    const decodedWithoutVerification = jwt.decode(token);
    console.log('Token payload (without verification):', decodedWithoutVerification);

    // Now verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token successfully verified');
      console.log('Decoded token payload:', decoded);
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError);
      return res.status(403).json({ 
        error: 'Invalid token',
        debug: jwtError.message
      });
    }

    if (!decoded.id || isNaN(decoded.id)) {
      console.error('❌ Invalid or missing partner ID in token:', decoded);
      return res.status(400).json({ 
        error: 'Invalid partner ID in token',
        debug: `Token payload: ${JSON.stringify(decoded)}`
      });
    }

    const partnerId = parseInt(decoded.id, 10);
    console.log('Looking up partner with ID:', partnerId);

    const partner = await Partner.findOne({ where: { id: partnerId } });
    if (!partner) {
      console.error('❌ Partner not found for ID:', partnerId);
      return res.status(404).json({ 
        error: 'Partner not found',
        debug: `No partner found with ID: ${partnerId}`
      });
    }

    console.log('✅ Partner found:', partner.id);
    req.current_partner = partner;
    next();
  } catch (error) {
    console.error('❌ Error in currentPartnerMiddleware:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to authenticate partner',
      debug: error.message
    });
  }
};

module.exports = currentPartnerMiddleware;
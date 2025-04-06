const { Partner, PartnerKey } = require('../../models');

const authenticatePartner = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const secretKey = req.headers['x-secret-key'];
    
    if (!apiKey || !secretKey) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'API key and Secret key are required'
      });
    }
    
    // Find partner key
    const partnerKey = await PartnerKey.findOne({
      where: { api_key: apiKey }
    });
    
    // Verify secret (using secure comparison)
    if (!partnerKey || partnerKey.secret_key !== secretKey) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid API credentials'
      });
    }
    
    // Find partner
    const partner = await Partner.findByPk(partnerKey.partnerId);
    if (!partner) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Partner not found'
      });
    }
    
    // Add partner to request
    req.partner = partner;
    next();
  } catch (error) {
    console.error('Partner authentication error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
};

module.exports = { authenticatePartner };
const crypto = require('crypto');
const { Partner, PartnerKey } = require('../../models');

const authenticatePartner = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const timestamp = req.headers['housetabz-timestamp'];
    const signature = req.headers['housetabz-signature'];
    
    // Check for all required headers
    if (!apiKey || !timestamp || !signature) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'API key, timestamp, and signature are required'
      });
    }
    
    // Find partner key
    const partnerKey = await PartnerKey.findOne({
      where: { api_key: apiKey }
    });
    
    if (!partnerKey) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid API key'
      });
    }
    
    // Verify timestamp is recent (within 5 minutes to prevent replay attacks)
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - requestTime) > 300) { // 5 minutes
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Request timestamp expired'
      });
    }
    
    // Generate expected signature WITH prefix
    const payload = JSON.stringify(req.body);
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', partnerKey.secret_key)
      .update(signedPayload)
      .digest('hex');
      
    const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;

   
    // Use timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignatureWithPrefix, 'utf8')
    )) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid signature'
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
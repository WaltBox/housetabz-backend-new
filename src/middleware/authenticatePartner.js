const { PartnerKey, Partner } = require('../models');

const authenticatePartner = async (req, res, next) => {
  console.log('Headers received:', req.headers); // Log headers for debugging

  const { api_key, secret_key } = req.headers;

  if (!api_key || !secret_key) {
    return res.status(401).json({ error: 'Missing API key or secret key' });
  }

  try {
    const partnerKey = await PartnerKey.findOne({
      where: { api_key, secret_key },
      include: [{ model: Partner }],
    });

    if (!partnerKey) {
      return res.status(403).json({ error: 'Invalid API key or secret key' });
    }

    req.partner = partnerKey.Partner;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = authenticatePartner;

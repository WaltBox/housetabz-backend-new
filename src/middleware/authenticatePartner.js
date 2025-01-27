// middleware/authenticatePartner.js
const { Partner, PartnerKey } = require('../models');

const authenticatePartner = async (req, res, next) => {
    const apiKey = req.headers['x-housetabz-api-key'];
    const secretKey = req.headers['x-housetabz-secret-key'];
    
    if (!apiKey || !secretKey) {
        return res.status(401).json({
            error: 'Authentication failed',
            message: 'Both API key and Secret key are required'
        });
    }

    try {
        const partnerKey = await PartnerKey.findOne({
            where: {
                api_key: apiKey,
                secret_key: secretKey
            }
        });

        if (!partnerKey) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid API credentials'
            });
        }

        // Add partner info to request object
        req.partnerId = partnerKey.partnerId;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during authentication'
        });
    }
};

module.exports = authenticatePartner;
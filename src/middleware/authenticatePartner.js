// middleware/authenticatePartner.js
const db = require('../models');  // Import your models index
const { Partner, PartnerKey } = db;  // Destructure the models you need

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
        // Log incoming request info
        console.log('Request params:', req.params);
        console.log('Request headers:', {
            apiKey: req.headers['x-housetabz-api-key'],
            secretKey: req.headers['x-housetabz-secret-key']
        });

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

        // Important: Set req.partnerId BEFORE checking URL params
        req.partnerId = partnerKey.partnerId;

        // If URL param exists but doesn't match the API key's partner, reject
        const urlPartnerId = req.params.partnerId;
        if (urlPartnerId && urlPartnerId !== 'undefined' && parseInt(urlPartnerId, 10) !== partnerKey.partnerId) {
            console.log('Partner ID mismatch:', {
                urlPartnerId,
                authenticatedPartnerId: partnerKey.partnerId
            });
            return res.status(403).json({
                error: 'Authentication failed',
                message: 'Partner ID mismatch'
            });
        }

        // Always use the partnerId from the API key
        req.params.partnerId = partnerKey.partnerId.toString();

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
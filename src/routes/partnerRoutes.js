const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Import controllers
const partnerController = require('../controllers/partnerController');
const stagedRequestController = require('../controllers/stagedRequestController');

// Import new middleware
const { authenticatePartner } = require('../middleware/auth/partnerAuth');
const { authenticateWebhook } = require('../middleware/auth/webhookAuth');
const { partnerApiLimiter, authLimiter } = require('../middleware/security/rateLimiter');
const { catchAsync } = require('../middleware/errorHandler');

// Group 1: Webhook routes
router.get('/webhook-config', authenticateWebhook, catchAsync(partnerController.getWebhookConfig));
router.post('/webhook-config', authenticateWebhook, catchAsync(partnerController.updateWebhookConfig));

// Group 2: Public authentication routes (with rate limiting)
router.post('/create', authLimiter, catchAsync(partnerController.createPartner));
router.post('/verify', authLimiter, catchAsync(partnerController.verifyPartner));
router.post('/login', authLimiter, catchAsync(partnerController.login));
router.post('/:partnerId/complete-registration', authLimiter, catchAsync(partnerController.completeRegistration));

router.get('/by-api-key', catchAsync(partnerController.getPartnerByApiKey));
// Group 3: Public information routes
router.get('/', catchAsync(partnerController.getAllPartners));
router.get('/:partnerId', catchAsync(partnerController.getPartnerById));

// Group 4: Protected partner routes using JWT authentication
// These routes use the currentPartnerMiddleware from your updated auth system
const { authenticateUser } = require('../middleware/auth/userAuth'); // For routes that should be user-accessible

// Routes for partner dashboard (requires login)
router.get('/current', authenticateWebhook, catchAsync((req, res) => {
  res.status(200).json({ partner: req.webhookPartner });
}));

router.get('/current/webhookLogs', authenticateWebhook, catchAsync(partnerController.getCurrentPartnerWebhookLogs));
router.post('/logout', authenticateWebhook, catchAsync(partnerController.logout));

router.put('/update-marketplace',
  authenticateWebhook,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'marketplace_cover', maxCount: 1 },
    { name: 'company_cover', maxCount: 1 }
  ]),
  catchAsync(partnerController.updateMarketplaceSettings)
);


// Group 5: Protected API routes (using API key authentication)
router.get('/:partnerId/api-keys', authenticatePartner, catchAsync(partnerController.getApiKeys));
router.get('/webhookLogs/:id', authenticatePartner, catchAsync(partnerController.getWebhookLogById));

// Group 6: Staged request routes
router.post('/:partnerId/staged-request', 
  authenticatePartner,
  catchAsync(stagedRequestController.createStagedRequest)
);

module.exports = router;
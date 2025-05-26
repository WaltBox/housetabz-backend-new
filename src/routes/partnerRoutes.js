const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Import controllers
const partnerController = require('../controllers/partnerController');
const stagedRequestController = require('../controllers/stagedRequestController');
const partnerBillController = require('../controllers/partnerBillController');

// Import middleware
const { authenticatePartner } = require('../middleware/auth/partnerAuth');
const { authenticatePartnerSession } = require('../middleware/auth/partnerSessionAuth');
const { authenticateUser } = require('../middleware/auth/userAuth')

const { partnerApiLimiter, authLimiter } = require('../middleware/security/rateLimiter');
const { catchAsync } = require('../middleware/errorHandler');


// Group 1: Public authentication routes (with rate limiting)
router.post('/create', authLimiter, catchAsync(partnerController.createPartner));
router.post('/verify', authLimiter, catchAsync(partnerController.verifyPartner));
router.post('/login', authLimiter, catchAsync(partnerController.login));
router.post('/:partnerId/complete-registration', authLimiter, catchAsync(partnerController.completeRegistration));

// Group 2: Public information routes (SPECIFIC ROUTES FIRST!)
router.get('/', catchAsync(partnerController.getAllPartners));
router.get('/by-api-key', catchAsync(partnerController.getPartnerByApiKey));

// Group 3: Protected partner dashboard routes (Session authentication)
// 🔥 THESE MUST COME BEFORE /:partnerId TO AVOID CONFLICTS
router.get('/current', authenticatePartnerSession, catchAsync(partnerController.getCurrentPartner));
router.get('/current/webhookLogs', authenticatePartnerSession, catchAsync(partnerController.getCurrentPartnerWebhookLogs));
router.post('/logout', authenticatePartnerSession, catchAsync(partnerController.logout));

router.post('/regenerate-credentials', authenticatePartnerSession, catchAsync(partnerController.regenerateApiCredentials));
router.put('/update-marketplace',
  authenticatePartnerSession,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'marketplace_cover', maxCount: 1 },
    { name: 'company_cover', maxCount: 1 }
  ]),
  catchAsync(partnerController.updateMarketplaceSettings)
);

// Group 4: Webhook configuration routes (Session authentication)
router.get('/webhook-config', authenticatePartnerSession, catchAsync(partnerController.getWebhookConfig));
router.post('/webhook-config', authenticatePartnerSession, catchAsync(partnerController.updateWebhookConfig));

// Group 5: Protected API routes (API key authentication)
router.get('/webhookLogs/:id', authenticatePartner, catchAsync(partnerController.getWebhookLogById));

// Group 6: Staged request routes (API key authentication)
router.post('/:partnerId/staged-request', authenticateUser, catchAsync(stagedRequestController.createStagedRequest));
router.post('/:partnerId/api-keys', authenticatePartner, catchAsync(partnerController.getApiKeys));

// Group 7: Bill routes (API key authentication)
router.post('/bills', authenticatePartner, catchAsync(partnerBillController.createBill));
router.patch('/bills/:externalBillId', authenticatePartner, catchAsync(partnerBillController.updateBill));

// Group 8: Parameterized routes (MUST BE LAST!)
// 🔥 THIS MUST BE AT THE END TO AVOID MATCHING SPECIFIC ROUTES
router.get('/:partnerId', catchAsync(partnerController.getPartnerById));

module.exports = router;
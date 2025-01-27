const express = require('express');
const partnerController = require('../controllers/partnerController');
const stagedRequestController = require('../controllers/stagedRequestController');
const authenticatePartner = require('../middleware/authenticatePartner');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const currentPartnerMiddleware = require('../middleware/currentPartnerMiddleware');
const webhookMiddleware = require('../middleware/webhookMiddleware');
// IMPORTANT: Place specific routes BEFORE parameterized routes
// Webhook routes should be at the top
router.get('/partners/webhook-config', webhookMiddleware, partnerController.getWebhookConfig);
router.post('/partners/webhook-config', webhookMiddleware, partnerController.updateWebhookConfig);

/**
 * @swagger
 * tags:
 *   name: Partners
 *   description: API for managing partner services
 */

/**
 * @swagger
 * /partners/create:
 *   post:
 *     summary: Create a new partner
 *     description: Registers a new partner and generates API keys.
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - registration_code
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rhythm Energy"
 *               registration_code:
 *                 type: string
 *                 example: "RH-1234"
 *     responses:
 *       201:
 *         description: Partner created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Partner created successfully"
 *                 partner:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 */
router.post('/partners/create', partnerController.createPartner);

/**
 * @swagger
 * /partners/{partnerId}/complete-registration:
 *   post:
 *     summary: Complete partner registration
 *     description: Allows a verified partner to complete their registration.
 *     tags: [Partners]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: ID of the partner to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - person_of_contact
 *               - email
 *               - password
 *               - phone_number
 *             properties:
 *               person_of_contact:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               phone_number:
 *                 type: string
 *                 example: "123-456-7890"
 *     responses:
 *       200:
 *         description: Registration completed successfully.
 *       400:
 *         description: Missing required fields.
 *       404:
 *         description: Partner not found.
 */
router.post('/partners/:partnerId/complete-registration', partnerController.completeRegistration);

/**
 * @swagger
 * /partners/verify:
 *   post:
 *     summary: Verify partner registration
 *     description: Validate the partner's name and registration code.
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - registration_code
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rhythm Energy"
 *               registration_code:
 *                 type: string
 *                 example: "RH-1234"
 *     responses:
 *       200:
 *         description: Partner verified successfully.
 *       404:
 *         description: Partner not found.
 */
router.post('/partners/verify', partnerController.verifyPartner);

/**
 * @swagger
 * /partners/login:
 *   post:
 *     summary: Partner login
 *     description: Logs in a partner using their email and password.
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "example@partner.com"
 *               password:
 *                 type: string
 *                 example: "securepassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *       400:
 *         description: Missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email and password are required"
 *       404:
 *         description: Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid email or password"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid email or password"
 */
router.post('/partners/login', partnerController.login);

/**
 * @swagger
 * /partners:
 *   get:
 *     summary: Get all partners
 *     description: Retrieves a list of all registered partners.
 *     tags: [Partners]
 *     responses:
 *       200:
 *         description: List of partners
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partners:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       logo:
 *                         type: string
 *                       about:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone_number:
 *                         type: string
 */
router.get('/partners', partnerController.getAllPartners);



router.get('/partners/current', currentPartnerMiddleware, (req, res) => {
    if (!req.current_partner) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }
  
    res.status(200).json({ partner: req.current_partner });
  });

  router.get('/partners/current/webhookLogs', currentPartnerMiddleware, partnerController.getCurrentPartnerWebhookLogs);

router.get('/webhookLogs/:id', authenticateToken, partnerController.getWebhookLogById);

  
  /**
 * @swagger
 * /partners/{partnerId}:
 *   get:
 *     summary: Get a partner by ID
 *     description: Retrieves details for a specific partner by their ID.
 *     tags: [Partners]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the partner
 *     responses:
 *       200:
 *         description: Partner details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partner:
 *                   type: object
 */
router.get('/partners/:partnerId', partnerController.getPartnerById);

/**
 * @swagger
 * /partners/{partnerId}/api-keys:
 *   get:
 *     summary: Get API keys for a partner
 *     description: Retrieves API keys associated with the specified partner.
 *     tags: [Partners]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the partner
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKeys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       api_key:
 *                         type: string
 *                       secret_key:
 *                         type: string
 *       404:
 *         description: No API keys found for this partner
 *       500:
 *         description: Failed to fetch API keys
 */
router.get('/partners/:partnerId/api-keys', partnerController.getApiKeys);


  /**
 * @swagger
 * /partners/logout:
 *   post:
 *     summary: Logout partner
 *     description: Logs out the currently logged-in partner by invalidating their session token.
 *     tags: [Partners]
 *     responses:
 *       200:
 *         description: Logout successful.
 *       500:
 *         description: Failed to log out.
 */
router.post('/partners/logout', authenticateToken, partnerController.logout);

router.post('/partners/:partnerId/staged-request', 
  authenticatePartner,  // Add this middleware
  stagedRequestController.createStagedRequest
);
module.exports = router;

const express = require('express');
const partnerController = require('../controllers/partnerController');
const stagedRequestController = require('../controllers/stagedRequestController');
const authenticatePartner = require('../middleware/authenticatePartner');
const router = express.Router();

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
router.post('/create', partnerController.createPartner);


/**
 * @swagger
 * /partners/complete-registration:
 *   post:
 *     summary: Complete partner registration
 *     description: Completes the partner registration process using a registration code.
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *  
 *               - phone_number
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rhythm Energy"
 *             
 *    
 *               phone_number:
 *                 type: string
 *                 example: "123-456-7890"
 *               email:
 *                 type: string
 *                 example: "example@partner.com"
 *               password:
 *                 type: string
 *                 example: "securepassword123"
 *     responses:
 *       200:
 *         description: Registration completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Registration completed successfully"
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "All fields are required"
 *       404:
 *         description: Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid name or registration code"
 */
router.post('/partners/complete-registration', partnerController.completeRegistration);

/**
 * @swagger
 * /partners/verify:
 *   post:
 *     summary: Verify a partner's name and registration code
 *     description: Validates the partner name and registration code before completing registration.
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
 *                 example: "Test Partner"
 *               registration_code:
 *                 type: string
 *                 example: "TEST12345"
 *     responses:
 *       200:
 *         description: Partner verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partner:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     registration_code:
 *                       type: string
 *       404:
 *         description: Invalid partner name or registration code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid name or registration code"
 *       500:
 *         description: Internal server error
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch partners"
 */
router.get('/partners', partnerController.getAllPartners);

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
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     logo:
 *                       type: string
 *                     about:
 *                       type: string
 *                     important_information:
 *                       type: string
 *                     registration_code:
 *                       type: string
 *                     person_of_contact:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone_number:
 *                       type: string
 *       404:
 *         description: Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Partner not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch partner"
 */
router.get('/partners/:partnerId', partnerController.getPartnerById);

/**
 * @swagger
 * /partners/{partnerId}/staged-request:
 *   post:
 *     summary: Create a staged request
 *     description: Partners can create a staged request for services. Requires valid API keys in headers.
 *     tags: [Partners]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the partner making the request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - serviceName
 *               - pricing
 *               - userId
 *             properties:
 *               transactionId:
 *                 type: string
 *                 example: "TXN-12345"
 *               serviceName:
 *                 type: string
 *                 example: "Electricity Plan"
 *               pricing:
 *                 type: number
 *                 example: 99.99
 *               userId:
 *                 type: integer
 *                 example: 101
 *     responses:
 *       201:
 *         description: Staged request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Staged request created successfully"
 *                 stagedRequest:
 *                   type: object
 */
router.post(
  '/:partnerId/staged-request',
  authenticatePartner,
  stagedRequestController.createStagedRequest
);

/**
 * @swagger
 * /partners/{partnerId}/api-keys:
 *   get:
 *     summary: Get API keys for a partner
 *     description: Retrieves all API keys associated with the specified partner ID.
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
 *         description: List of API keys
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
 *         description: No API keys found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No API keys found for this partner"
 */
router.get('/partners/:partnerId/api-keys', partnerController.getApiKeys);

module.exports = router;

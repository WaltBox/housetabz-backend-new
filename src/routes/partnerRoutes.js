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
 * /api/partners/create:
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
 * /api/partners/verify:
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
 * /api/partners/login:
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
 * /api/partners:
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

/**
 * @swagger
 * /api/partners/{partnerId}:
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

module.exports = router;

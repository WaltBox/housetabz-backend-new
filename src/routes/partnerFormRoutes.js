const express = require('express');
const router = express.Router();
const partnerFormController = require('../controllers/partnerFormController');

/**
 * @swagger
 * components:
 *   schemas:
 *     PartnerForm:
 *       type: object
 *       required:
 *         - businessEmail
 *         - phoneNumber
 *         - businessWebsite
 *         - city
 *         - state
 *         - country
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the partner form entry
 *         businessEmail:
 *           type: string
 *           description: Business email address
 *         phoneNumber:
 *           type: string
 *           description: Business phone number
 *         businessWebsite:
 *           type: string
 *           description: URL of the business website
 *         city:
 *           type: string
 *           description: City of the business
 *         state:
 *           type: string
 *           description: State of the business
 *         country:
 *           type: string
 *           description: Country of the business
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the entry was last updated
 */

/**
 * @swagger
 * /partner-forms:
 *   post:
 *     summary: Submit a partner form
 *     tags: [PartnerForm]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PartnerForm'
 *     responses:
 *       201:
 *         description: Partner form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PartnerForm'
 *       400:
 *         description: Bad Request
 */
router.post('/', partnerFormController.addPartnerForm);

/**
 * @swagger
 * /partner-forms:
 *   get:
 *     summary: Get all partner form entries
 *     tags: [PartnerForm]
 *     responses:
 *       200:
 *         description: List of partner form entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PartnerForm'
 */
router.get('/', partnerFormController.getPartnerForms);

/**
 * @swagger
 * /partner-forms/{id}:
 *   get:
 *     summary: Get a specific partner form entry by ID
 *     tags: [PartnerForm]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the partner form entry
 *     responses:
 *       200:
 *         description: Partner form entry details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PartnerForm'
 *       404:
 *         description: Partner form entry not found
 */
router.get('/:id', partnerFormController.getPartnerFormById);

module.exports = router;

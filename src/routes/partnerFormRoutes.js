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
 *         - businessName
 *         - contactName
 *         - phoneNumber
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the partner form entry
 *         businessName:
 *           type: string
 *           description: Name of the business
 *         contactName:
 *           type: string
 *           description: Name of the contact person
 *         phoneNumber:
 *           type: string
 *           description: Business phone number
 *         email:
 *           type: string
 *           description: Email address for contact
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
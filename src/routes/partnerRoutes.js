const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');

/**
 * @swagger
 * tags:
 *   name: Partners
 *   description: API endpoints for managing partners
 */

/**
 * @swagger
 * /partners:
 *   post:
 *     summary: Create a new partner
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               about:
 *                 type: string
 *               important_information:
 *                 type: string
 *               logo:
 *                 type: string
 *               marketplace_cover:
 *                 type: string
 *               company_cover:
 *                 type: string
 *               avg_price:
 *                 type: number
 *               registration_code:
 *                 type: string
 *               person_of_contact:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Partner created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', partnerController.createPartner);

/**
 * @swagger
 * /partners:
 *   get:
 *     summary: Get all partners
 *     tags: [Partners]
 *     responses:
 *       200:
 *         description: List of partners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Partner'
 */
router.get('/', partnerController.getAllPartners);

/**
 * @swagger
 * /partners/{id}:
 *   get:
 *     summary: Get partner by ID
 *     tags: [Partners]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The partner ID
 *     responses:
 *       200:
 *         description: Partner data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Partner'
 *       404:
 *         description: Partner not found
 */
router.get('/:id', partnerController.getPartnerById);

module.exports = router;

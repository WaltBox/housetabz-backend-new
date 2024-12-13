const express = require('express');
const partnerController = require('../controllers/partnerController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Partners
 *   description: API for managing partners
 */

/**
 * @swagger
 * /api/partners:
 *   post:
 *     summary: Create a new partner
 *     tags:
 *       - Partners
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *               marketplace_cover:
 *                 type: string
 *               company_cover:
 *                 type: string
 *               about:
 *                 type: string
 *               important_information:
 *                 type: string
 *               how_to:
 *                 type: string
 *               link:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [plannable, formable]
 *     responses:
 *       201:
 *         description: Partner created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', partnerController.createPartner);

/**
 * @swagger
 * /api/partners:
 *   get:
 *     summary: Get all partners
 *     tags:
 *       - Partners
 *     responses:
 *       200:
 *         description: List of partners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', partnerController.getAllPartners);

/**
 * @swagger
 * /api/partners/{id}:
 *   get:
 *     summary: Get a partner by ID
 *     tags:
 *       - Partners
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the partner to fetch
 *     responses:
 *       200:
 *         description: Partner details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Partner not found
 */
router.get('/:id', partnerController.getPartnerById);

/**
 * @swagger
 * /api/partners/{id}/offers:
 *   get:
 *     summary: Get partner by ID with offers or forms
 *     tags:
 *       - Partners
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the partner
 *     responses:
 *       200:
 *         description: Partner and service offers
 *       404:
 *         description: Partner not found
 */
router.get('/:id/offers', partnerController.getPartnerWithOffers);

/**
 * @swagger
 * /api/partners/{id}:
 *   patch:
 *     summary: Update a partner by ID
 *     tags:
 *       - Partners
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the partner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               about:
 *                 type: string
 *               important_information:
 *                 type: string
 *               how_to:
 *                 type: string
 *               link:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [plannable, formable]
 *     responses:
 *       200:
 *         description: Partner updated successfully
 *       404:
 *         description: Partner not found
 */
router.patch('/:id', partnerController.updatePartner);

module.exports = router;

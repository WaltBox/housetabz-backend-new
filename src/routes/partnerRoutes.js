const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');

/**
 * @swagger
 * /partners:
 *   post:
 *     summary: Add a new partner
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
 *                 example: "Rhythm Energy"
 *               description:
 *                 type: string
 *                 example: "Energy provider"
 *     responses:
 *       201:
 *         description: Partner added successfully
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
 *         description: List of all partners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Rhythm Energy"
 *                   description:
 *                     type: string
 *                     example: "Energy provider"
 */
router.get('/', partnerController.getAllPartners);

/**
 * @swagger
 * /partners/{id}:
 *   get:
 *     summary: Get partner by ID with service offers (if applicable)
 *     tags: [Partners]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the partner to retrieve
 *         example: 1
 *     responses:
 *       200:
 *         description: Partner details with service offers (if available)
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
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Rhythm Energy"
 *                     description:
 *                       type: string
 *                       example: "Energy provider"
 *                 serviceOffers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       uuid:
 *                         type: string
 *                         example: "abc123-uuid"
 *                       title:
 *                         type: string
 *                         example: "12-Month Plan"
 *                       term_months:
 *                         type: integer
 *                         example: 12
 *                       rhythm_kwh_rate:
 *                         type: number
 *                         example: 0.11
 *                       price_1000_kwh:
 *                         type: number
 *                         example: 110.00
 *                       renewable_energy:
 *                         type: boolean
 *                         example: true
 *                       description_en:
 *                         type: string
 *                         example: "Affordable renewable energy plan."
 *       404:
 *         description: Partner not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', partnerController.getPartnerWithOffers);

module.exports = router;

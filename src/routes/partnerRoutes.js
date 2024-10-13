// src/routes/partnerRoutes.js
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
 *     summary: Get partner by ID
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
 *         description: Partner details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: "Rhythm Energy"
 *                 description:
 *                   type: string
 *                   example: "Energy provider"
 *       404:
 *         description: Partner not found
 */
router.get('/:id', partnerController.getPartner);

module.exports = router;

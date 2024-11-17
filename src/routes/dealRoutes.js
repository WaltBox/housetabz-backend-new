const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');

/**
 * @swagger
 * tags:
 *   name: Deals
 *   description: API for managing deals
 */

/**
 * @swagger
 * /deals:
 *   post:
 *     summary: Create a new deal
 *     tags: [Deals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "10% off all services"
 *               details:
 *                 type: string
 *                 example: "Enjoy a 10% discount on all services until the end of the year."
 *               expiration_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               partner_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   example: 1
 *     responses:
 *       201:
 *         description: Deal created successfully
 */
router.post('/', dealController.createDeal);

/**
 * @swagger
 * /deals:
 *   get:
 *     summary: Get all deals
 *     tags: [Deals]
 *     responses:
 *       200:
 *         description: List of all deals
 */
router.get('/', dealController.getAllDeals);

/**
 * @swagger
 * /deals/{id}:
 *   get:
 *     summary: Get a deal by ID
 *     tags: [Deals]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the deal
 *     responses:
 *       200:
 *         description: Deal details
 *       404:
 *         description: Deal not found
 */
router.get('/:id', dealController.getDealById);

/**
 * @swagger
 * /deals/{id}:
 *   patch:
 *     summary: Update a deal
 *     tags: [Deals]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the deal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               details:
 *                 type: string
 *               expiration_date:
 *                 type: string
 *                 format: date
 *               partner_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Deal updated successfully
 *       404:
 *         description: Deal not found
 */
router.patch('/:id', dealController.updateDeal);

/**
 * @swagger
 * /deals/{id}:
 *   delete:
 *     summary: Delete a deal
 *     tags: [Deals]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the deal
 *     responses:
 *       200:
 *         description: Deal deleted successfully
 *       404:
 *         description: Deal not found
 */
router.delete('/:id', dealController.deleteDeal);

module.exports = router;

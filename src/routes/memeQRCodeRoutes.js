const express = require('express');
const router = express.Router();
const memeQRCodeController = require('../controllers/memeQRCodeController');

/**
 * @swagger
 * tags:
 *   name: MemeQRCodes
 *   description: API for managing meme QR codes for marketing campaigns
 */

/**
 * @swagger
 * /meme-qr-codes:
 *   post:
 *     summary: Create a new meme QR code
 *     tags: [MemeQRCodes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - city
 *               - memeId
 *             properties:
 *               city:
 *                 type: string
 *                 example: "Austin"
 *               memeId:
 *                 type: string
 *                 example: "roommate_drama"
 *               memeDescription:
 *                 type: string
 *                 example: "Funny roommate disagreement meme"
 *               location:
 *                 type: string
 *                 example: "UT Austin Campus"
 *     responses:
 *       201:
 *         description: QR code created successfully
 */
router.post('/', memeQRCodeController.createMemeQRCode);

/**
 * @swagger
 * /meme-qr-codes:
 *   get:
 *     summary: Get all meme QR codes
 *     tags: [MemeQRCodes]
 *     responses:
 *       200:
 *         description: List of all meme QR codes
 */
router.get('/', memeQRCodeController.getAllMemeQRCodes);


/**
 * @swagger
 * /meme-qr-codes/{id}:
 *   get:
 *     summary: Get a meme QR code by ID
 *     tags: [MemeQRCodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The meme QR code ID
 *     responses:
 *       200:
 *         description: Meme QR code details
 */
router.get('/:id', memeQRCodeController.getMemeQRCodeById);

module.exports = router;
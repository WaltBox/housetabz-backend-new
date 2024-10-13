/**
 * @swagger
 * tags:
 *   name: RhythmOffers
 *   description: API for fetching rhythm offers
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Rhythm Test API URL
const RHYTHM_API_URL = 'http://localhost:3000/api/v2/offer-snapshots';

/**
 * @swagger
 * /v2/rhythm-offers:
 *   get:
 *     summary: Retrieve all rhythm offers
 *     tags: [RhythmOffers]
 *     responses:
 *       200:
 *         description: A list of rhythm offers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   uuid:
 *                     type: string
 *                     example: 095be615-a8ad-4c33-8e9c-c7612fbf6c9f
 *                   title:
 *                     type: string
 *                     example: Energy Plan 12 Months
 *                   term_months:
 *                     type: integer
 *                     example: 12
 *                   rhythm_kwh_rate:
 *                     type: string
 *                     example: 0.15
 *                   zip_codes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["22699", "84150", "89581"]
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(RHYTHM_API_URL);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching all rhythm offers:', error.message);
    res.status(500).json({ error: 'Failed to fetch offers.' });
  }
});

/**
 * @swagger
 * /v2/rhythm-offers/{zipcode}:
 *   get:
 *     summary: Retrieve rhythm offers available for a specific Zip Code
 *     tags: [RhythmOffers]
 *     parameters:
 *       - in: path
 *         name: zipcode
 *         schema:
 *           type: string
 *         required: true
 *         description: The Zip Code to filter offers by
 *         example: 22699
 *     responses:
 *       200:
 *         description: A list of rhythm offers available at the given Zip Code
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   uuid:
 *                     type: string
 *                     example: 095be615-a8ad-4c33-8e9c-c7612fbf6c9f
 *                   title:
 *                     type: string
 *                     example: Energy Plan 12 Months
 *                   rhythm_kwh_rate:
 *                     type: string
 *                     example: 0.15
 *                   zip_codes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["22699"]
 *       404:
 *         description: No offers found for the specified Zip Code
 *       500:
 *         description: Server error
 */
router.get('/:zipcode', async (req, res) => {
  const { zipcode } = req.params;

  try {
    const response = await axios.get(`${RHYTHM_API_URL}/zipcode/${zipcode}`);
    if (response.data.length === 0) {
      return res.status(404).json({ error: 'No offers found for the specified Zip Code.' });
    }
    res.status(200).json(response.data);
  } catch (error) {
    console.error(`Error fetching offers for zipcode ${zipcode}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch offers by zipcode.' });
  }
});

module.exports = router;

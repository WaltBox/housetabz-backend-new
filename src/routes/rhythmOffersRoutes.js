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
 *     responses:
 *       200:
 *         description: A list of rhythm offers available at the given Zip Code
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

/**
 * @swagger
 * /v2/rhythm-offers/uuid/{uuid}:
 *   get:
 *     summary: Retrieve a specific rhythm offer by UUID
 *     tags: [RhythmOffers]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         schema:
 *           type: string
 *         required: true
 *         description: The UUID of the rhythm offer to retrieve
 *     responses:
 *       200:
 *         description: A rhythm offer snapshot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Offer not found
 *       500:
 *         description: Server error
 */
router.get('/uuid/:uuid', async (req, res) => {
  const { uuid } = req.params;

  try {
    const response = await axios.get(`${RHYTHM_API_URL}/${uuid}`);
    if (!response.data) {
      return res.status(404).json({ error: 'Offer not found.' });
    }
    res.status(200).json(response.data);
  } catch (error) {
    console.error(`Error fetching offer with UUID ${uuid}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch offer by UUID.' });
  }
});

module.exports = router;

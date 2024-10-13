// controllers/rhythmOfferRequestController.js
const { RhythmOfferRequest } = require('../models');

exports.createRhythmOfferRequest = async (req, res) => {
  try {
    const { house_id, user_id, offerSnapshot } = req.body;

    const newRequest = await RhythmOfferRequest.create({
      ...offerSnapshot,
      house_id,
      user_id,
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating offer request:', error);
    res.status(500).json({ error: 'Failed to create offer request.' });
  }
};

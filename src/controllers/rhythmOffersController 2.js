const axios = require('axios');

// Base API URL for the Rhythm Test API
const RHYTHM_API_URL = 'http://localhost:3000/api/v2/offer-snapshots';

// Fetch all offer snapshots
exports.getAllRhythmOffers = async (req, res) => {
  try {
    const response = await axios.get(`${RHYTHM_API_URL}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers.' });
  }
};

// Fetch offer snapshots by zipcode
exports.getRhythmOffersByZip = async (req, res) => {
  const { zipcode } = req.params;
  try {
    const response = await axios.get(`${RHYTHM_API_URL}/zipcode/${zipcode}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching offers by zipcode:', error);
    res.status(500).json({ error: 'Failed to fetch offers by zipcode.' });
  }
};

// Fetch a specific offer snapshot by UUID
exports.getOfferSnapshotByUUID = async (req, res) => {
  const { uuid } = req.params;
  try {
    const response = await axios.get(`${RHYTHM_API_URL}/${uuid}`);
    if (!response.data) {
      return res.status(404).json({ error: 'Offer not found.' });
    }
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching offer with UUID ${uuid}:`, error);
    res.status(500).json({ error: 'Failed to fetch offer by UUID.' });
  }
};

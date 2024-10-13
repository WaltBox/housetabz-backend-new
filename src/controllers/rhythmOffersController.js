const axios = require('axios');

// Fetch all offer snapshots
exports.getAllRhythmOffers = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3000/api/v2/offer-snapshots');
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
    const response = await axios.get(
      `http://localhost:3000/api/v2/offer-snapshots/zipcode/${zipcode}`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching offers by zipcode:', error);
    res.status(500).json({ error: 'Failed to fetch offers by zipcode.' });
  }
};

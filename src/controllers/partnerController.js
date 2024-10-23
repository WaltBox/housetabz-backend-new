const db = require('../models');
const Partner = db.Partner; // Ensure the correct reference
const axios = require('axios'); // For external API requests

// Create a new partner
exports.createPartner = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const newPartner = await Partner.create({ name, description });
    res.status(201).json({
      message: 'Partner added successfully',
      partner: newPartner,
    });
  } catch (error) {
    next(error);
  }
};

// Get all partners
exports.getAllPartners = async (req, res, next) => {
  try {
    const partners = await Partner.findAll();
    res.status(200).json(partners);
  } catch (error) {
    next(error);
  }
};

// Get a single partner by ID, and include service offers if it's Rhythm
exports.getPartnerWithOffers = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch the partner details by ID
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    let serviceOffers = [];

    // If the partner is 'Rhythm', fetch offers from the external API
    if (partner.name.toLowerCase() === 'rhythm') {
      console.log('Fetching Rhythm offers...');
      try {
        const response = await axios.get('http://localhost:3000/api/v2/offer-snapshots');
        serviceOffers = response.data;
      } catch (apiError) {
        console.error('Error fetching Rhythm offers:', apiError);
        return res.status(500).json({ error: 'Failed to fetch Rhythm offers' });
      }
    }

    // Return the partner details with any applicable offers
    res.status(200).json({ partner, serviceOffers });
  } catch (error) {
    next(error);
  }
};

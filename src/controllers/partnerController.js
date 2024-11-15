const db = require('../models');
const Partner = db.Partner;
const axios = require('axios'); // For external API requests

// Create a new partner
exports.createPartner = async (req, res, next) => {
  try {
    const { name, description, logo, marketplace_cover, company_cover, about, important_information } = req.body;
    const newPartner = await Partner.create({ name, description, logo, marketplace_cover, company_cover, about, important_information });
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

exports.updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { about, important_information } = req.body;
    
    const partner = await Partner.findByPk(id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Prepare the fields to update
    const updateData = {
      about,
      important_information,
    };

    // Check for uploaded files and add their paths to the update
    if (req.files['logo']) {
      updateData.logo = req.files['logo'][0].path;
    }
    if (req.files['marketplace_cover']) {
      updateData.marketplace_cover = req.files['marketplace_cover'][0].path;
    }
    if (req.files['company_cover']) {
      updateData.company_cover = req.files['company_cover'][0].path;
    }

    // Update partner with new data
    await partner.update(updateData);

    res.status(200).json({
      message: 'Partner updated successfully',
      partner,
    });
  } catch (error) {
    next(error);
  }
};
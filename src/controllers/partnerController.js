const db = require('../models');
const Partner = db.Partner;
const axios = require('axios'); // For external API requests

// Create a new partner
exports.createPartner = async (req, res, next) => {
  try {
    const { name, description, logo, marketplace_cover, company_cover, about, important_information, type } = req.body;

    // Validate the type field
    if (!['plannable', 'formable'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Allowed values are plannable or formable.' });
    }

    const newPartner = await Partner.create({ 
      name, 
      description, 
      logo, 
      marketplace_cover, 
      company_cover, 
      about, 
      important_information, 
      type 
    });

    res.status(201).json({
      message: 'Partner added successfully',
      partner: newPartner,
    });
  } catch (error) {
    console.error('Error creating partner:', error);
    next(error);
  }
};

// Get all partners
exports.getAllPartners = async (req, res, next) => {
  try {
    const partners = await Partner.findAll();
    res.status(200).json(partners);
  } catch (error) {
    console.error('Error fetching all partners:', error);
    next(error);
  }
};

// Get a single partner with offers
exports.getPartnerWithOffers = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch partner details by ID
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    let serviceOffers = [];

    // Logic for plannable partners
    if (partner.type === 'plannable') {
      try {
        const response = await axios.get(`http://external-api.com/offers?partnerId=${id}`);
        serviceOffers = response.data;
      } catch (apiError) {
        console.error('Error fetching service offers:', apiError);
      }
    }

    // Logic for formable partners (if applicable)
    if (partner.type === 'formable') {
      // Add logic to handle formable partners, e.g., custom pricing or parameter forms
      serviceOffers = []; // Placeholder for form-based service offers
    }

    res.status(200).json({ partner, serviceOffers });
  } catch (error) {
    console.error('Error fetching partner:', error);
    next(error);
  }
};

// Update a partner
exports.updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { about, important_information, type } = req.body;

    // Validate the type field if provided
    if (type && !['plannable', 'formable'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Allowed values are plannable or formable.' });
    }

    // Find the partner by ID
    const partner = await Partner.findByPk(id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Prepare fields for update
    const updateData = { about, important_information };
    if (type) updateData.type = type;

    // Handle file uploads
    if (req.files) {
      if (req.files['logo']) {
        updateData.logo = req.files['logo'][0].path;
      }
      if (req.files['marketplace_cover']) {
        updateData.marketplace_cover = req.files['marketplace_cover'][0].path;
      }
      if (req.files['company_cover']) {
        updateData.company_cover = req.files['company_cover'][0].path;
      }
    }

    // Update the partner
    await partner.update(updateData);

    res.status(200).json({
      message: 'Partner updated successfully',
      partner,
    });
  } catch (error) {
    console.error('Error updating partner:', error);
    next(error);
  }
};

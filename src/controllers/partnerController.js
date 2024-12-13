const db = require('../models');
const Partner = db.Partner;
const axios = require('axios'); // For external API requests

// Create a new partner
exports.createPartner = async (req, res, next) => {
  try {
    const { name, description, logo, marketplace_cover, company_cover, about, important_information, how_to, link, type } = req.body;

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
      how_to,
      link,
      type,
    });

    res.status(201).json({ message: 'Partner added successfully', partner: newPartner });
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
    console.error('Error fetching partners:', error);
    next(error);
  }
};

// Get partner by ID with offers or forms
exports.getPartnerWithOffers = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch the partner details
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    let serviceOffers = [];
    if (partner.type === 'plannable' && partner.name === 'Rhythm Energy') {
      try {
        const response = await axios.get('http://localhost:3000/api/v2/offer-snapshots');
        serviceOffers = response.data; // Assuming this returns the plans
      } catch (apiError) {
        console.error('Error fetching Rhythm Energy plans:', apiError);
        return res.status(500).json({ error: 'Failed to fetch plans' });
      }
    }

    // Include `how_to` and `link` fields in the partner object
    const response = {
      partner: {
        id: partner.id,
        name: partner.name,
        description: partner.description,
        logo: partner.logo,
        marketplace_cover: partner.marketplace_cover,
        company_cover: partner.company_cover,
        about: partner.about,
        important_information: partner.important_information,
        how_to: partner.how_to, // Included how_to
        link: partner.link, // Included link
        type: partner.type,
        form: partner.type === 'formable', // Conditional field
        createdAt: partner.createdAt,
        updatedAt: partner.updatedAt,
      },
      serviceOffers,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching partner:', error);
    next(error);
  }
};


// Get partner by ID
exports.getPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch the partner details
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.status(200).json(partner);
  } catch (error) {
    console.error('Error fetching partner by ID:', error);
    next(error);
  }
};


// Update a partner
exports.updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { about, important_information, how_to, link, type } = req.body;

    if (type && !['plannable', 'formable'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Allowed values are plannable or formable.' });
    }

    const partner = await Partner.findByPk(id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    const updateData = { about, important_information, how_to, link };
    if (type) updateData.type = type;

    if (req.files) {
      if (req.files['logo']) updateData.logo = req.files['logo'][0].path;
      if (req.files['marketplace_cover']) updateData.marketplace_cover = req.files['marketplace_cover'][0].path;
      if (req.files['company_cover']) updateData.company_cover = req.files['company_cover'][0].path;
    }

    await partner.update(updateData);
    res.status(200).json({ message: 'Partner updated successfully', partner });
  } catch (error) {
    console.error('Error updating partner:', error);
    next(error);
  }
};

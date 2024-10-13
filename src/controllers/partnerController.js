// src/controllers/partnerController.js

// Import your models
const db = require('../models');
const Partner = db.Partner; // Ensure the correct reference

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

// Get all partners
exports.getPartner = async (req, res, next) => {
  try {
    const partner = await Partner.findByPk(req.params.id);
    res.status(200).json(partner);
  } catch (error) {
    next(error);
  }
};

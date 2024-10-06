// src/controllers/servicePlanController.js

const { ServicePlan, Partner } = require('../models');

// Create a new service plan
exports.createServicePlan = async (req, res, next) => {
  try {
    const { name, price, details, partnerId } = req.body;

    // Check if the partner exists
    const partner = await Partner.findByPk(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Create the new service plan
    const newServicePlan = await ServicePlan.create({ name, price, details, partnerId });

    res.status(201).json({
      message: 'Service plan added successfully',
      servicePlan: newServicePlan,
    });
  } catch (error) {
    next(error);
  }
};

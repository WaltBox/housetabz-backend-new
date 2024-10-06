const { ServicePlan, Partner } = require('../models');


// src/controllers/servicePlanController.js
exports.createServicePlan = async (req, res, next) => {
    console.log('createServicePlan called'); // Add this line
    try {
      const { partnerId } = req.params;
      const { name, price, details } = req.body;
  
      // Check if the partner exists
      const partner = await Partner.findByPk(partnerId);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }
  
      // Create the new service plan associated with the partner
      const newServicePlan = await ServicePlan.create({ name, price, details, partnerId });
  
      res.status(201).json({
        message: 'Service plan added successfully',
        servicePlan: newServicePlan,
      });
    } catch (error) {
      next(error);
    }
  };
  
// src/controllers/servicePlanController.js
exports.getServicePlansForPartner = async (req, res, next) => {
    try {
      const { partnerId } = req.params;
  
      // Check if the partner exists
      const partner = await Partner.findByPk(partnerId);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }
  
      // Get all service plans for the partner
      const servicePlans = await ServicePlan.findAll({
        where: { partnerId },
      });
  
      res.status(200).json(servicePlans);
    } catch (error) {
      next(error);
    }
  };
  

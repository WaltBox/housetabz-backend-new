// src/controllers/houseServiceController.js

// src/controllers/houseServiceController.js

const { HouseService, House, Partner, ServicePlan } = require('../models'); // Ensure all models are imported correctly

// Add a service to a house
exports.addServiceToHouse = async (req, res, next) => {
    try {
      const { id } = req.params; // House ID
      const { partnerId, servicePlanId, status } = req.body;
  
      // Check if the house exists
      const house = await House.findByPk(id);
      if (!house) {
        return res.status(404).json({ message: 'House not found' });
      }
  
      // Check if the partner exists
      const partner = await Partner.findByPk(partnerId);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }
  
      // Check if the service plan exists if it is provided
      if (servicePlanId) {
        const servicePlan = await ServicePlan.findByPk(servicePlanId);
        if (!servicePlan) {
          return res.status(404).json({ message: 'Service Plan not found' });
        }
      }
  
      // Create a new house service entry
      const newHouseService = await HouseService.create({
        houseId: id,
        partnerId,
        servicePlanId,
        status,
      });
  
      res.status(201).json({
        message: 'Service added successfully to the house',
        houseService: newHouseService,
      });
    } catch (error) {
      next(error);
    }
  };
  
  // Get all services for a house
  exports.getServicesForHouse = async (req, res, next) => {
    try {
      const { id } = req.params; // House ID
  
      // Check if the house exists
      const house = await House.findByPk(id);
      if (!house) {
        return res.status(404).json({ message: 'House not found' });
      }
  
      // Find all services associated with the house
      const houseServices = await HouseService.findAll({
        where: { houseId: id },
        include: [
          { model: Partner, attributes: ['name', 'description'] },
          { model: ServicePlan, attributes: ['name', 'price', 'details'] },
        ],
      });
  
      res.status(200).json(houseServices);
    } catch (error) {
      next(error);
    }
  };
  
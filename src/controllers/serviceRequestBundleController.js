const { ServiceRequestBundle, Task, User, Sequelize } = require('../models');
const { Op } = Sequelize; // Import Sequelize operators

// Create service request bundle (Tasks are automatically created via afterCreate hook)
exports.createServiceRequestBundle = async (req, res, next) => {
  try {
    const { houseId, userId, status } = req.body;

    // Create the service request bundle
    const serviceRequestBundle = await ServiceRequestBundle.create({
      houseId,
      userId,
      status,
    });

    res.status(201).json({
      message: 'Service request bundle created successfully',
      serviceRequestBundle,
    });
  } catch (error) {
    console.error('Error creating service request bundle:', error);
    next(error); // Pass error to error-handling middleware
  }
};

// Get all service request bundles for a house
exports.getServiceRequestBundles = async (req, res, next) => {
  try {
    const { houseId } = req.query;

    console.log('Fetching service request bundles for houseId:', houseId); // Debugging

    const serviceRequests = await ServiceRequestBundle.findAll({
      where: { houseId },
      include: [
        { model: Task, as: 'tasks' } // Ensure alias matches association in the model
      ],
    });

    console.log('Service request bundles found:', serviceRequests); // Debugging

    res.status(200).json({
      message: 'Service request bundles retrieved successfully',
      serviceRequests,
    });
  } catch (error) {
    console.error('Error fetching service request bundles:', error);
    next(error); // Pass error to error-handling middleware
  }
};

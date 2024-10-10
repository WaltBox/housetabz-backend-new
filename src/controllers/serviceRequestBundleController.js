const { ServiceRequestBundle, Task, User, Sequelize } = require('../models');
const { Op } = Sequelize;  // Import Sequelize operators

// Create service request bundle and corresponding tasks
exports.createServiceRequestBundle = async (req, res, next) => {
  try {
    const { houseId, userId, status } = req.body;

    // Create the service request bundle
    const serviceRequestBundle = await ServiceRequestBundle.create({
      houseId,
      userId,
      status,
    });

  // Automatically create tasks for all housemates except the submitter
const users = await User.findAll({
  where: { houseId, id: { [Op.ne]: userId } },  // Exclude the user who submitted the request
});

const tasks = users.map(user => ({
  type: 'service request',
  userId: user.id,
  serviceRequestBundleId: serviceRequestBundle.id,
}));




    await Task.bulkCreate(tasks);

    res.status(201).json({
      message: 'Service request bundle and tasks created successfully',
      serviceRequestBundle,
      tasks,
    });
  } catch (error) {
    console.error("Error creating service request bundle:", error);  // Log the actual error
    next(error);
  }
};

// Get all service request bundles
exports.getServiceRequestBundles = async (req, res, next) => {
  try {
    const { houseId } = req.query;
    console.log('Fetching service requests for houseId:', houseId);  // Debugging

    const serviceRequests = await ServiceRequestBundle.findAll({
      where: { houseId },
      include: [{ model: Task, as: 'tasks' }]  // Ensure 'tasks' alias matches association
    });

    console.log('Service requests found:', serviceRequests);  // Debugging

    res.status(200).json({
      message: 'Service requests retrieved successfully',
      serviceRequests
    });
  } catch (error) {
    console.error('Error fetching service requests:', error);  // Log error
    next(error);
  }
};


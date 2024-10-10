const { Task, User } = require('../models');

// Create individual service requests (tasks)
exports.createServiceRequest = async (req, res, next) => {
  try {
    const { bundleId, userId, status } = req.body;
    const task = await Task.create({
      type: 'service request',  // Identify it as a service request
      status: status || 'pending',
      userId,
      serviceRequestBundleId: bundleId,
    });
    res.status(201).json({ message: 'Service request created', task });
  } catch (error) {
    next(error);
  }
};

// Get all tasks
exports.getAllTasks = async (req, res, next) => {
    try {
      const tasks = await Task.findAll();
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  };
  
  // Get tasks for a specific user
  exports.getTasksForUser = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const tasks = await Task.findAll({ where: { userId } });
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  };
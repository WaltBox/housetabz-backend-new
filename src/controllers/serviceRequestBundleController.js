const { ServiceRequestBundle, Task, User } = require('../models');
const Sequelize = require('sequelize');

const serviceRequestBundleController = {
  // Create a ServiceRequestBundle based on a StagedRequest
  async createServiceRequestBundle(req, res) {
    try {
      const { userId, stagedRequestId } = req.body;

      // Validate input
      if (!userId || !stagedRequestId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Fetch user and their houseId
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create the ServiceRequestBundle
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        stagedRequestId,
        status: 'pending',
      });

      // Fetch all roommates except the creator
      const roommates = await User.findAll({
        where: {
          houseId: user.houseId,
          id: { [Sequelize.Op.ne]: userId },
        },
      });

      // Create tasks for roommates
      const tasks = roommates.map((roommate) => ({
        userId: roommate.id,
        serviceRequestBundleId: serviceRequestBundle.id,
        type: 'service_request',
        status: false,
      }));
      await Task.bulkCreate(tasks);

      res.status(201).json({
        message: 'Service request bundle created successfully',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('Error creating service request bundle:', error);
      res.status(500).json({ error: 'Failed to create service request bundle' });
    }
  },

  // Fetch all ServiceRequestBundles, optionally filtered by houseId
  async getServiceRequestBundles(req, res) {
    try {
      const { houseId } = req.query;

      // Filter bundles by houseId if provided
      const condition = houseId ? { houseId } : {};
      const serviceRequestBundles = await ServiceRequestBundle.findAll({
        where: condition,
        include: [{ model: Task, as: 'tasks' }],
      });

      res.status(200).json({
        message: 'Service request bundles retrieved successfully',
        serviceRequestBundles,
      });
    } catch (error) {
      console.error('Error fetching service request bundles:', error);
      res.status(500).json({ error: 'Failed to fetch service request bundles' });
    }
  },

  // Fetch a specific ServiceRequestBundle by ID
  async getServiceRequestBundleById(req, res) {
    try {
      const { id } = req.params;

      const serviceRequestBundle = await ServiceRequestBundle.findByPk(id, {
        include: [{ model: Task, as: 'tasks' }],
      });

      if (!serviceRequestBundle) {
        return res.status(404).json({ error: 'Service request bundle not found' });
      }

      res.status(200).json({
        message: 'Service request bundle retrieved successfully',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('Error fetching service request bundle:', error);
      res.status(500).json({ error: 'Failed to fetch service request bundle' });
    }
  },

  // Update the status of a ServiceRequestBundle
  async updateServiceRequestBundle(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate input
      if (!status) {
        return res.status(400).json({ error: 'Missing status field' });
      }

      const serviceRequestBundle = await ServiceRequestBundle.findByPk(id);

      if (!serviceRequestBundle) {
        return res.status(404).json({ error: 'Service request bundle not found' });
      }

      serviceRequestBundle.status = status;
      await serviceRequestBundle.save();

      res.status(200).json({
        message: 'Service request bundle updated successfully',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('Error updating service request bundle:', error);
      res.status(500).json({ error: 'Failed to update service request bundle' });
    }
  },

  // Delete a ServiceRequestBundle
  async deleteServiceRequestBundle(req, res) {
    try {
      const { id } = req.params;

      const serviceRequestBundle = await ServiceRequestBundle.findByPk(id);

      if (!serviceRequestBundle) {
        return res.status(404).json({ error: 'Service request bundle not found' });
      }

      await serviceRequestBundle.destroy();

      res.status(200).json({ message: 'Service request bundle deleted successfully' });
    } catch (error) {
      console.error('Error deleting service request bundle:', error);
      res.status(500).json({ error: 'Failed to delete service request bundle' });
    }
  },
};

module.exports = serviceRequestBundleController;

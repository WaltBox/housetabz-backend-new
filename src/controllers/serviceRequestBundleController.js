const { ServiceRequestBundle, Task, User, StagedRequest } = require('../models');
const Sequelize = require('sequelize');

const serviceRequestBundleController = {
  async createServiceRequestBundle(req, res) {
    try {
      const { userId, stagedRequestId } = req.body;

      // Validate input
      if (!userId || !stagedRequestId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Ensure userId is treated as a string for comparison
      const creatorId = String(userId);

      // Fetch user and their houseId
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch the staged request to get payment details
      const stagedRequest = await StagedRequest.findByPk(stagedRequestId);
      if (!stagedRequest) {
        return res.status(404).json({ error: 'Staged request not found' });
      }

      // Create the ServiceRequestBundle
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        stagedRequestId,
        status: 'pending',
        totalPaidUpfront: 0
      });

      // Fetch ALL roommates INCLUDING the creator
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId }
      });

      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const individualPaymentAmount = stagedRequest.requiredUpfrontPayment ? 
        (stagedRequest.requiredUpfrontPayment / totalRoommates).toFixed(2) : null;

      // Create tasks for all users
      const tasks = allRoommates.map((roommate) => {
        const isCreator = String(roommate.id) === creatorId;
        
        return {
          userId: roommate.id,
          serviceRequestBundleId: serviceRequestBundle.id,
          type: 'service_request',
          status: isCreator, // Will be true for creator
          response: isCreator ? 'accepted' : 'pending',
          paymentRequired: !!stagedRequest.requiredUpfrontPayment,
          paymentAmount: individualPaymentAmount,
          paymentStatus: stagedRequest.requiredUpfrontPayment ? 'pending' : 'not_required'
        };
      });

      // Log task creation details for debugging
      console.log('Creating tasks:', tasks.map(task => ({
        userId: task.userId,
        isCreator: String(task.userId) === creatorId,
        status: task.status,
        response: task.response
      })));

      const createdTasks = await Task.bulkCreate(tasks);

      res.status(201).json({
        message: 'Service request bundle created successfully',
        serviceRequestBundle,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error creating service request bundle:', error);
      res.status(500).json({ error: 'Failed to create service request bundle' });
    }
  },

  // Rest of the controller methods remain the same...
  async getServiceRequestBundles(req, res) {
    try {
      const { houseId } = req.query;
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

  async updateServiceRequestBundle(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      if (!status) {
        return res.status(400).json({ error: 'Missing status field' });
      }
  
      const serviceRequestBundle = await ServiceRequestBundle.findByPk(id, {
        include: [{ model: StagedRequest }]
      });
  
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
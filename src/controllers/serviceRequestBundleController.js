const { ServiceRequestBundle, Task, User, StagedRequest } = require('../models');
const Sequelize = require('sequelize');

const serviceRequestBundleController = {
  async createServiceRequestBundle(req, res) {
    try {
      const { userId, stagedRequestId } = req.body;
      console.log('[createServiceRequestBundle] Received request with userId:', userId, 'stagedRequestId:', stagedRequestId);

      // Validate input
      if (!userId || !stagedRequestId) {
        console.log('[createServiceRequestBundle] Missing required fields.');
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Ensure userId is treated as a string for comparison
      const creatorId = String(userId);
      console.log('[createServiceRequestBundle] Creator ID (string):', creatorId);

      // Fetch user and their houseId
      console.log('[createServiceRequestBundle] Fetching user...');
      const user = await User.findByPk(userId);
      if (!user) {
        console.log('[createServiceRequestBundle] User not found.');
        return res.status(404).json({ error: 'User not found' });
      }
      console.log('[createServiceRequestBundle] User found:', user);

      // Fetch the staged request to get payment details
      console.log('[createServiceRequestBundle] Fetching staged request...');
      const stagedRequest = await StagedRequest.findByPk(stagedRequestId);
      if (!stagedRequest) {
        console.log('[createServiceRequestBundle] Staged request not found.');
        return res.status(404).json({ error: 'Staged request not found' });
      }
      console.log('[createServiceRequestBundle] Staged request fetched:', stagedRequest);

      // Create the ServiceRequestBundle
      console.log('[createServiceRequestBundle] Creating ServiceRequestBundle...');
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        stagedRequestId,
        status: 'pending',
        totalPaidUpfront: 0
      });
      console.log('[createServiceRequestBundle] ServiceRequestBundle created:', serviceRequestBundle);

      // Fetch ALL roommates INCLUDING the creator
      console.log('[createServiceRequestBundle] Fetching all roommates for houseId:', user.houseId);
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId }
      });
      console.log('[createServiceRequestBundle] Roommates fetched:', allRoommates.map(roommate => roommate.id));

      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const individualPaymentAmount = stagedRequest.requiredUpfrontPayment ? 
        (stagedRequest.requiredUpfrontPayment / totalRoommates).toFixed(2) : null;
      console.log('[createServiceRequestBundle] Calculated individualPaymentAmount:', individualPaymentAmount);

      // Create tasks for all users
      const tasks = allRoommates.map((roommate) => {
        const isCreator = String(roommate.id) === creatorId;
        return {
          userId: roommate.id,
          serviceRequestBundleId: serviceRequestBundle.id,
          type: 'service_request',
          status: isCreator, // true for creator, false otherwise
          response: isCreator ? 'accepted' : 'pending',
          paymentRequired: !!stagedRequest.requiredUpfrontPayment,
          paymentAmount: individualPaymentAmount,
          paymentStatus: stagedRequest.requiredUpfrontPayment ? 'pending' : 'not_required'
        };
      });

      console.log('[createServiceRequestBundle] Creating tasks:', tasks.map(task => ({
        userId: task.userId,
        isCreator: String(task.userId) === creatorId,
        status: task.status,
        response: task.response
      })));

      const createdTasks = await Task.bulkCreate(tasks);
      console.log('[createServiceRequestBundle] Tasks created:', createdTasks.map(task => task.id));

      res.status(201).json({
        message: 'Service request bundle created successfully',
        serviceRequestBundle,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('[createServiceRequestBundle] Error creating service request bundle:', error);
      res.status(500).json({ error: 'Failed to create service request bundle' });
    }
  },

  async getServiceRequestBundles(req, res) {
    try {
      const { houseId } = req.query;
      console.log('[getServiceRequestBundles] Fetching bundles for houseId:', houseId);
      const condition = houseId ? { houseId } : {};
      const serviceRequestBundles = await ServiceRequestBundle.findAll({
        where: condition,
        include: [{ model: Task, as: 'tasks' }],
      });
      console.log('[getServiceRequestBundles] Bundles fetched:', serviceRequestBundles.map(bundle => bundle.id));

      res.status(200).json({
        message: 'Service request bundles retrieved successfully',
        serviceRequestBundles,
      });
    } catch (error) {
      console.error('[getServiceRequestBundles] Error fetching service request bundles:', error);
      res.status(500).json({ error: 'Failed to fetch service request bundles' });
    }
  },

  async getServiceRequestBundleById(req, res) {
    try {
      const { id } = req.params;
      console.log('[getServiceRequestBundleById] Fetching bundle with id:', id);
      const serviceRequestBundle = await ServiceRequestBundle.findByPk(id, {
        include: [
          {
            model: Task,
            as: 'tasks',
            include: [{
              model: User,
              as: 'user', // Must match the alias defined in the Task association
              attributes: ['id', 'username'] // Only select id and username from the User model
            }]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username'] // Only include the username (and id, if needed)
          },
          {
            model: StagedRequest,
            as: 'stagedRequest'
          }
        ]
      });
      
      if (!serviceRequestBundle) {
        console.log('[getServiceRequestBundleById] Bundle not found for id:', id);
        return res.status(404).json({ error: 'Service request bundle not found' });
      }
      
      console.log('[getServiceRequestBundleById] Bundle fetched:', serviceRequestBundle);
      
      res.status(200).json({
        message: 'Service request bundle retrieved successfully',
        serviceRequestBundle: {
          ...serviceRequestBundle.toJSON(),
          status: serviceRequestBundle.status,
          totalParticipants: serviceRequestBundle.tasks.length,
          acceptedCount: serviceRequestBundle.tasks.filter(t => t.response === 'accepted').length
        }
      });
    } catch (error) {
      console.error('[getServiceRequestBundleById] Error fetching service request bundle:', error);
      res.status(500).json({ error: 'Failed to fetch service request bundle' });
    }
  },
  

  async updateServiceRequestBundle(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      console.log('[updateServiceRequestBundle] Updating bundle with id:', id, 'to status:', status);

      if (!status) {
        console.log('[updateServiceRequestBundle] Missing status field.');
        return res.status(400).json({ error: 'Missing status field' });
      }

      const serviceRequestBundle = await ServiceRequestBundle.findByPk(id, {
        include: [
          {
            model: Task,
            as: 'tasks',
            include: [{
              model: User,
              as: 'user', // Here is where you add the alias and attributes
              attributes: ['id', 'username']
            }]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id','username']
          },
          {
            model: StagedRequest,
            as: 'stagedRequest'
          }
        ]
      });
  
      if (!serviceRequestBundle) {
        console.log('[updateServiceRequestBundle] Bundle not found for id:', id);
        return res.status(404).json({ error: 'Service request bundle not found' });
      }
  
      serviceRequestBundle.status = status;
      await serviceRequestBundle.save();
      console.log('[updateServiceRequestBundle] Bundle updated:', serviceRequestBundle);
  
      res.status(200).json({
        message: 'Service request bundle updated successfully',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('[updateServiceRequestBundle] Error updating bundle:', error);
      res.status(500).json({ error: 'Failed to update service request bundle' });
    }
  },

  async deleteServiceRequestBundle(req, res) {
    try {
      const { id } = req.params;
      console.log('[deleteServiceRequestBundle] Deleting bundle with id:', id);
      const serviceRequestBundle = await ServiceRequestBundle.findByPk(id);
  
      if (!serviceRequestBundle) {
        console.log('[deleteServiceRequestBundle] Bundle not found for id:', id);
        return res.status(404).json({ error: 'Service request bundle not found' });
      }
  
      await serviceRequestBundle.destroy();
      console.log('[deleteServiceRequestBundle] Bundle deleted successfully.');
      res.status(200).json({ message: 'Service request bundle deleted successfully' });
    } catch (error) {
      console.error('[deleteServiceRequestBundle] Error deleting bundle:', error);
      res.status(500).json({ error: 'Failed to delete service request bundle' });
    }
  },
};

module.exports = serviceRequestBundleController;

// src/controllers/serviceRequestBundleController.js
const { ServiceRequestBundle, Task, User, StagedRequest, TakeOverRequest, VirtualCardRequest } = require('../models');
const Sequelize = require('sequelize');
const houseServiceController = require('./houseServiceController');

const serviceRequestBundleController = {
  async createServiceRequestBundle(req, res) {
    try {
      const { userId, stagedRequestId, takeOverRequestId, virtualCardRequestId, type } = req.body;
      console.log('[createServiceRequestBundle] Received request with userId:', userId, 
        'stagedRequestId:', stagedRequestId, 'takeOverRequestId:', takeOverRequestId, 
        'virtualCardRequestId:', virtualCardRequestId, 'type:', type);

      // Validate input
      if (!userId || (!stagedRequestId && !takeOverRequestId && !virtualCardRequestId)) {
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
      console.log('[createServiceRequestBundle] User found:', user.id);

      // Determine service type and payment details based on the request type
      let requestDetails;
      let bundleType = type || 'marketplace_onetime'; // Default if not provided
      
      if (stagedRequestId) {
        console.log('[createServiceRequestBundle] Fetching staged request...');
        const stagedRequest = await StagedRequest.findByPk(stagedRequestId);
        if (!stagedRequest) {
          console.log('[createServiceRequestBundle] Staged request not found.');
          return res.status(404).json({ error: 'Staged request not found' });
        }
        requestDetails = stagedRequest;
        // If no type specified, use marketplace_onetime for staged requests
        bundleType = type || 'marketplace_onetime';
      } else if (takeOverRequestId) {
        console.log('[createServiceRequestBundle] Fetching take over request...');
        const takeOverRequest = await TakeOverRequest.findByPk(takeOverRequestId);
        if (!takeOverRequest) {
          console.log('[createServiceRequestBundle] Take over request not found.');
          return res.status(404).json({ error: 'Take over request not found' });
        }
        requestDetails = takeOverRequest;
        // If no type specified, determine based on service details
        if (!type) {
          bundleType = takeOverRequest.serviceType === 'fixed' ? 'fixed_recurring' : 'variable_recurring';
        }
      } else if (virtualCardRequestId) {
        console.log('[createServiceRequestBundle] Fetching virtual card request...');
        const virtualCardRequest = await VirtualCardRequest.findByPk(virtualCardRequestId);
        if (!virtualCardRequest) {
          console.log('[createServiceRequestBundle] Virtual card request not found.');
          return res.status(404).json({ error: 'Virtual card request not found' });
        }
        requestDetails = virtualCardRequest;
        // Virtual cards are typically for marketplace_onetime
        bundleType = type || 'marketplace_onetime';
      }

      // Create the ServiceRequestBundle
      console.log('[createServiceRequestBundle] Creating ServiceRequestBundle with type:', bundleType);
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        stagedRequestId,
        takeOverRequestId,
        virtualCardRequestId,
        status: 'pending',
        totalPaidUpfront: 0,
        type: bundleType
      });
      console.log('[createServiceRequestBundle] ServiceRequestBundle created:', serviceRequestBundle.id);

      // Fetch ALL roommates INCLUDING the creator
      console.log('[createServiceRequestBundle] Fetching all roommates for houseId:', user.houseId);
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId }
      });
      console.log('[createServiceRequestBundle] Roommates fetched:', allRoommates.length);

      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const requiredUpfrontPayment = requestDetails.requiredUpfrontPayment || 0;
      const individualPaymentAmount = requiredUpfrontPayment > 0 ? 
        (requiredUpfrontPayment / totalRoommates).toFixed(2) : null;
      console.log('[createServiceRequestBundle] Calculated individualPaymentAmount:', individualPaymentAmount);

      // Create tasks for all users
      const tasks = allRoommates.map((roommate) => {
        const isCreator = String(roommate.id) === creatorId;
        const paymentRequired = requiredUpfrontPayment > 0;

        return {
          userId: roommate.id,
          serviceRequestBundleId: serviceRequestBundle.id,
          type: stagedRequestId ? 'service_request' : 'take_over_request',
          status: isCreator, // true for creator, false otherwise
          response: isCreator ? 'accepted' : 'pending',
          paymentRequired,
          paymentAmount: individualPaymentAmount,
          paymentStatus: paymentRequired ? 'pending' : 'not_required'
        };
      });

      console.log('[createServiceRequestBundle] Creating tasks for all roommates');
      const createdTasks = await Task.bulkCreate(tasks);
      console.log('[createServiceRequestBundle] Tasks created:', createdTasks.length);

      res.status(201).json({
        message: 'Service request bundle created successfully',
        serviceRequestBundle,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('[createServiceRequestBundle] Error creating service request bundle:', error);
      res.status(500).json({ error: 'Failed to create service request bundle', details: error.message });
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
      console.log('[getServiceRequestBundles] Bundles fetched:', serviceRequestBundles.length);

      res.status(200).json({
        message: 'Service request bundles retrieved successfully',
        serviceRequestBundles,
      });
    } catch (error) {
      console.error('[getServiceRequestBundles] Error fetching service request bundles:', error);
      res.status(500).json({ error: 'Failed to fetch service request bundles', details: error.message });
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
              as: 'user',
              attributes: ['id', 'username']
            }]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username']
          },
          {
            model: StagedRequest,
            as: 'stagedRequest'
          },
          {
            model: TakeOverRequest,
            as: 'takeOverRequest'
          },
          {
            model: VirtualCardRequest,
            as: 'virtualCardRequest'
          }
        ]
      });
      
      if (!serviceRequestBundle) {
        console.log('[getServiceRequestBundleById] Bundle not found for id:', id);
        return res.status(404).json({ error: 'Service request bundle not found' });
      }
      
      console.log('[getServiceRequestBundleById] Bundle fetched:', serviceRequestBundle.id);
      
      res.status(200).json({
        message: 'Service request bundle retrieved successfully',
        serviceRequestBundle: {
          ...serviceRequestBundle.toJSON(),
          totalParticipants: serviceRequestBundle.tasks.length,
          acceptedCount: serviceRequestBundle.tasks.filter(t => t.response === 'accepted').length
        }
      });
    } catch (error) {
      console.error('[getServiceRequestBundleById] Error fetching service request bundle:', error);
      res.status(500).json({ error: 'Failed to fetch service request bundle', details: error.message });
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
              as: 'user',
              attributes: ['id', 'username']
            }]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username']
          },
          {
            model: StagedRequest,
            as: 'stagedRequest'
          },
          {
            model: TakeOverRequest,
            as: 'takeOverRequest'
          },
          {
            model: VirtualCardRequest,
            as: 'virtualCardRequest'
          }
        ]
      });
  
      if (!serviceRequestBundle) {
        console.log('[updateServiceRequestBundle] Bundle not found for id:', id);
        return res.status(404).json({ error: 'Service request bundle not found' });
      }
  
      const previousStatus = serviceRequestBundle.status;
      serviceRequestBundle.status = status;
      await serviceRequestBundle.save();
      console.log('[updateServiceRequestBundle] Bundle updated from', previousStatus, 'to', status);
      
      // If status changed to 'accepted', create a HouseService
      if (previousStatus !== 'accepted' && status === 'accepted') {
        try {
          console.log('[updateServiceRequestBundle] Creating HouseService for bundle:', id);
          const houseService = await houseServiceController.createFromServiceRequestBundle(id);
          console.log('[updateServiceRequestBundle] HouseService created:', houseService ? houseService.id : 'none');
        } catch (error) {
          console.error('[updateServiceRequestBundle] Error creating HouseService:', error);
          // Continue even if HouseService creation fails
        }
      }
  
      res.status(200).json({
        message: 'Service request bundle updated successfully',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('[updateServiceRequestBundle] Error updating bundle:', error);
      res.status(500).json({ error: 'Failed to update service request bundle', details: error.message });
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
      res.status(500).json({ error: 'Failed to delete service request bundle', details: error.message });
    }
  },
};

module.exports = serviceRequestBundleController;
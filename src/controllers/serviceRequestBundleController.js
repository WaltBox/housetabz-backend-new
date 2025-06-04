// src/controllers/serviceRequestBundleController.js
const { ServiceRequestBundle, Task, User, StagedRequest, TakeOverRequest, VirtualCardRequest } = require('../models');
const Sequelize = require('sequelize');
const houseServiceController = require('./houseServiceController');

const serviceRequestBundleController = {
  async createServiceRequestBundle(req, res) {
    try {
      const { userId, stagedRequestId, takeOverRequestId, virtualCardRequestId, type } = req.body;

      // Validate input
      if (!userId || (!stagedRequestId && !takeOverRequestId && !virtualCardRequestId)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Ensure userId is treated as a string for comparison
      const creatorId = String(userId);

      // Fetch user and their houseId
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Determine service type and payment details based on the request type
      let requestDetails;
      let bundleType = type || 'marketplace_onetime'; // Default if not provided
      
      if (stagedRequestId) {
        const stagedRequest = await StagedRequest.findByPk(stagedRequestId);
        if (!stagedRequest) {
          return res.status(404).json({ error: 'Staged request not found' });
        }
        requestDetails = stagedRequest;
        // If no type specified, use marketplace_onetime for staged requests
        bundleType = type || 'marketplace_onetime';
      } else if (takeOverRequestId) {
        const takeOverRequest = await TakeOverRequest.findByPk(takeOverRequestId);
        if (!takeOverRequest) {
          return res.status(404).json({ error: 'Take over request not found' });
        }
        requestDetails = takeOverRequest;
        // If no type specified, determine based on service details
        if (!type) {
          bundleType = takeOverRequest.serviceType === 'fixed' ? 'fixed_recurring' : 'variable_recurring';
        }
      } else if (virtualCardRequestId) {
        const virtualCardRequest = await VirtualCardRequest.findByPk(virtualCardRequestId);
        if (!virtualCardRequest) {
          return res.status(404).json({ error: 'Virtual card request not found' });
        }
        requestDetails = virtualCardRequest;
        // Virtual cards are typically for marketplace_onetime
        bundleType = type || 'marketplace_onetime';
      }

      // Create the ServiceRequestBundle
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

      // Fetch ALL roommates INCLUDING the creator
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId }
      });

      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const requiredUpfrontPayment = requestDetails.requiredUpfrontPayment || 0;
      const individualPaymentAmount = requiredUpfrontPayment > 0 ? 
        (requiredUpfrontPayment / totalRoommates).toFixed(2) : null;

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

      const createdTasks = await Task.bulkCreate(tasks, { transaction, individualHooks: true });

      res.status(201).json({
        message: 'Service request bundle created successfully',
        serviceRequestBundle,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error creating service request bundle:', error);
      res.status(500).json({ error: 'Failed to create service request bundle', details: error.message });
    }
  },

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
      res.status(500).json({ error: 'Failed to fetch service request bundles', details: error.message });
    }
  },

  // In src/controllers/serviceRequestBundleController.js
async getServiceRequestBundleById(req, res) {
  try {
    // Convert id to integer to ensure proper type matching
    const id = parseInt(req.params.id, 10);
    
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
      return res.status(404).json({ error: 'Service request bundle not found' });
    }
    
    res.status(200).json({
      message: 'Service request bundle retrieved successfully',
      serviceRequestBundle: {
        ...serviceRequestBundle.toJSON(),
        totalParticipants: serviceRequestBundle.tasks.length,
        acceptedCount: serviceRequestBundle.tasks.filter(t => t.response === 'accepted').length
      }
    });
  } catch (error) {
    console.error('Error fetching service request bundle:', error);
    res.status(500).json({ error: 'Failed to fetch service request bundle', details: error.message });
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
        return res.status(404).json({ error: 'Service request bundle not found' });
      }
  
      const previousStatus = serviceRequestBundle.status;
      serviceRequestBundle.status = status;
      await serviceRequestBundle.save();
      
      // If status changed to 'accepted', create a HouseService
      if (previousStatus !== 'accepted' && status === 'accepted') {
        try {
          const houseService = await houseServiceController.createFromServiceRequestBundle(id);
        } catch (error) {
          console.error('Error creating HouseService:', error);
          // Continue even if HouseService creation fails
        }
      }
  
      res.status(200).json({
        message: 'Service request bundle updated successfully',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('Error updating bundle:', error);
      res.status(500).json({ error: 'Failed to update service request bundle', details: error.message });
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
      console.error('Error deleting bundle:', error);
      res.status(500).json({ error: 'Failed to delete service request bundle', details: error.message });
    }
  },
};

module.exports = serviceRequestBundleController;
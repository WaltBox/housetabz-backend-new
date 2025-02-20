// src/controllers/virtualCardRequestController.js
const { VirtualCardRequest, ServiceRequestBundle, User, Task } = require('../models');

const virtualCardRequestController = {
  async createVirtualCardRequest(req, res) {
    try {
      const { 
        serviceName, 
        monthlyAmount,
        dueDate,
        requiredUpfrontPayment,
        userId 
      } = req.body;

      // Validate input
      if (!serviceName || !monthlyAmount || !dueDate || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Fetch user and their houseId
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create the VirtualCardRequest
      const virtualCardRequest = await VirtualCardRequest.create({
        serviceName,
        monthlyAmount,
        dueDate,
        requiredUpfrontPayment,
        status: 'pending'
      });

      // Create the ServiceRequestBundle
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        virtualCardRequestId: virtualCardRequest.id,
        status: 'pending',
        totalPaidUpfront: 0
      });

      // Fetch all roommates including the creator
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId }
      });

      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const individualPaymentAmount = requiredUpfrontPayment ? 
        (requiredUpfrontPayment / totalRoommates).toFixed(2) : null;

      // Create tasks for all roommates
      const tasks = allRoommates.map((roommate) => {
        const isCreator = String(roommate.id) === String(userId);
        const paymentRequired = !!requiredUpfrontPayment;

        return {
          userId: roommate.id,
          serviceRequestBundleId: serviceRequestBundle.id,
          type: 'service_request',
          status: isCreator ? !paymentRequired : false,
          response: isCreator ? 'accepted' : 'pending',
          paymentRequired,
          paymentAmount: individualPaymentAmount,
          paymentStatus: paymentRequired ? 'pending' : 'not_required'
        };
      });

      const createdTasks = await Task.bulkCreate(tasks);

      res.status(201).json({
        message: 'Virtual card request and service request bundle created successfully',
        virtualCardRequest,
        serviceRequestBundle,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error creating virtual card request:', error);
      res.status(500).json({ 
        error: 'Failed to create virtual card request',
        details: error.message
      });
    }
  },

  async getVirtualCardRequests(req, res) {
    try {
      const { houseId } = req.query;
      
      const virtualCardRequests = await VirtualCardRequest.findAll({
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          where: houseId ? { houseId } : {},
          include: [{ 
            model: Task,
            as: 'tasks',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username']
            }]
          }]
        }]
      });

      res.status(200).json({
        message: 'Virtual card requests retrieved successfully',
        virtualCardRequests
      });
    } catch (error) {
      console.error('Error fetching virtual card requests:', error);
      res.status(500).json({ error: 'Failed to fetch virtual card requests' });
    }
  },

  async getVirtualCardRequestById(req, res) {
    try {
      const { id } = req.params;
      
      const virtualCardRequest = await VirtualCardRequest.findByPk(id, {
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
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
            }
          ]
        }]
      });

      if (!virtualCardRequest) {
        return res.status(404).json({ error: 'Virtual card request not found' });
      }

      res.status(200).json({
        message: 'Virtual card request retrieved successfully',
        virtualCardRequest: {
          ...virtualCardRequest.toJSON(),
          totalParticipants: virtualCardRequest.serviceRequestBundle.tasks.length,
          acceptedCount: virtualCardRequest.serviceRequestBundle.tasks.filter(t => t.response === 'accepted').length
        }
      });
    } catch (error) {
      console.error('Error fetching virtual card request:', error);
      res.status(500).json({ error: 'Failed to fetch virtual card request' });
    }
  },

  async updateVirtualCardRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const virtualCardRequest = await VirtualCardRequest.findByPk(id);

      if (!virtualCardRequest) {
        return res.status(404).json({ error: 'Virtual card request not found' });
      }

      virtualCardRequest.status = status;
      await virtualCardRequest.save();

      res.status(200).json({
        message: 'Virtual card request status updated successfully',
        virtualCardRequest
      });
    } catch (error) {
      console.error('Error updating virtual card request status:', error);
      res.status(500).json({ error: 'Failed to update virtual card request status' });
    }
  }
};

module.exports = virtualCardRequestController;
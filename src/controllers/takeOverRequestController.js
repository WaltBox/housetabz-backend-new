// src/controllers/takeOverRequestController.js
const { TakeOverRequest, ServiceRequestBundle, User, Task } = require('../models');

const takeOverRequestController = {
  async createTakeOverRequest(req, res) {
    try {
      const { 
        serviceName,
        accountNumber, 
        monthlyAmount,
        dueDate,
        requiredUpfrontPayment,
        userId,
        isFixedService // Add this new parameter
      } = req.body;

      // Validate input
      if (!serviceName || !accountNumber || !monthlyAmount || !dueDate || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Fetch user and their houseId
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Calculate createDay (approximately 2 weeks before dueDay)
      let createDay = null;
      if (dueDate) {
        // If dueDate is less than 15, createDay will be in previous month
        // We add 16 to get about 2 weeks before, then modulo 31 and adjust
        createDay = (parseInt(dueDate) + 16) % 31;
        if (createDay === 0) createDay = 31;
      }

      // Create the TakeOverRequest
      const takeOverRequest = await TakeOverRequest.create({
        serviceName,
        accountNumber,
        monthlyAmount,
        dueDate,
        requiredUpfrontPayment,
        serviceType: isFixedService ? 'fixed' : 'variable', // Set service type based on checkbox
        status: 'pending'
      });

      // Create the ServiceRequestBundle
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        takeOverRequestId: takeOverRequest.id,
        status: 'pending',
        totalPaidUpfront: 0,
        type: isFixedService ? 'fixed_recurring' : 'variable_recurring', // Set bundle type
        metadata: {
          createDay: createDay
        }
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
          type: 'take_over_request',
          status: isCreator ? !paymentRequired : false,
          response: isCreator ? 'accepted' : 'pending',
          paymentRequired,
          paymentAmount: individualPaymentAmount,
          paymentStatus: paymentRequired ? 'pending' : 'not_required'
        };
      });

      const createdTasks = await Task.bulkCreate(tasks);

      res.status(201).json({
        message: 'Take over request and service request bundle created successfully',
        takeOverRequest,
        serviceRequestBundle,
        tasks: createdTasks,
        createDay: createDay // Return the calculated createDay
      });
    } catch (error) {
      console.error('Error creating take over request:', error);
      res.status(500).json({ 
        error: 'Failed to create take over request',
        details: error.message
      });
    }
  },

  async getTakeOverRequests(req, res) {
    try {
      const { houseId } = req.query;
      
      const takeOverRequests = await TakeOverRequest.findAll({
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
        message: 'Take over requests retrieved successfully',
        takeOverRequests
      });
    } catch (error) {
      console.error('Error fetching take over requests:', error);
      res.status(500).json({ error: 'Failed to fetch take over requests' });
    }
  },

  async getTakeOverRequestById(req, res) {
    try {
      const { id } = req.params;
      
      const takeOverRequest = await TakeOverRequest.findByPk(id, {
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

      if (!takeOverRequest) {
        return res.status(404).json({ error: 'Take over request not found' });
      }

      res.status(200).json({
        message: 'Take over request retrieved successfully',
        takeOverRequest: {
          ...takeOverRequest.toJSON(),
          totalParticipants: takeOverRequest.serviceRequestBundle.tasks.length,
          acceptedCount: takeOverRequest.serviceRequestBundle.tasks.filter(t => t.response === 'accepted').length
        }
      });
    } catch (error) {
      console.error('Error fetching take over request:', error);
      res.status(500).json({ error: 'Failed to fetch take over request' });
    }
  },

  async updateTakeOverRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const takeOverRequest = await TakeOverRequest.findByPk(id);

      if (!takeOverRequest) {
        return res.status(404).json({ error: 'Take over request not found' });
      }

      takeOverRequest.status = status;
      await takeOverRequest.save();

      res.status(200).json({
        message: 'Take over request status updated successfully',
        takeOverRequest
      });
    } catch (error) {
      console.error('Error updating take over request status:', error);
      res.status(500).json({ error: 'Failed to update take over request status' });
    }
  }
};

module.exports = takeOverRequestController;
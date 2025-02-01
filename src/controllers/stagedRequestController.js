const { StagedRequest, ServiceRequestBundle, User, Task, Partner } = require('../models');
const Sequelize = require('sequelize');

const stagedRequestController = {
  async createStagedRequest(req, res) {
    try {
      const { 
        transactionId, 
        serviceName, 
        serviceType,
        estimatedAmount,
        requiredUpfrontPayment,
        userId 
      } = req.body;
      const { partnerId } = req.params;

      // Validate input
      if (!transactionId || !serviceName || !serviceType || !userId || !partnerId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Fetch the partner
      const partner = await Partner.findByPk(partnerId);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Fetch user and their houseId
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Determine upfront amount based on service type
      const upfrontAmount = serviceType === 'cleaning' ? 
        estimatedAmount : // For cleaning, full amount upfront
        requiredUpfrontPayment; // For energy, just the security deposit if any

      // Create the StagedRequest
      const stagedRequest = await StagedRequest.create({
        partnerName: partner.name,
        partnerId: partner.id,
        transactionId,
        serviceName,
        serviceType,
        estimatedAmount,
        requiredUpfrontPayment: upfrontAmount,
        status: 'staged'
      });

      // Create the ServiceRequestBundle
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        stagedRequestId: stagedRequest.id,
        status: 'pending',
        totalPaidUpfront: 0
      });

      // Fetch all roommates including the creator
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId }
      });

      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const individualPaymentAmount = upfrontAmount ? 
        (upfrontAmount / totalRoommates).toFixed(2) : null;

      // Log task creation parameters
      console.log('Creating tasks with parameters:', {
        totalRoommates,
        individualPaymentAmount,
        creatorId: userId,
        paymentRequired: !!upfrontAmount
      });

      // Create tasks for all roommates
      const tasks = allRoommates.map((roommate) => {
        const isCreator = String(roommate.id) === String(userId);
        const paymentRequired = !!upfrontAmount;

        const task = {
          userId: roommate.id,
          serviceRequestBundleId: serviceRequestBundle.id,
          type: 'service_request',
          status: isCreator ? !paymentRequired : false, // Only true for creator if no payment needed
          response: isCreator ? 'accepted' : 'pending',
          paymentRequired,
          paymentAmount: individualPaymentAmount,
          paymentStatus: paymentRequired ? 'pending' : 'not_required'
        };

        // Log individual task creation
        console.log('Creating task:', {
          userId: roommate.id,
          isCreator,
          status: task.status,
          response: task.response,
          paymentRequired: task.paymentRequired,
          paymentStatus: task.paymentStatus
        });

        return task;
      });

      // Create all tasks in the database
      const createdTasks = await Task.bulkCreate(tasks);

      // Log created tasks for verification
      console.log('Tasks created:', createdTasks.map(task => ({
        userId: task.userId,
        isCreator: String(task.userId) === String(userId),
        status: task.status,
        response: task.response,
        paymentStatus: task.paymentStatus
      })));

      res.status(201).json({
        message: 'Staged request and service request bundle created successfully',
        stagedRequest,
        serviceRequestBundle,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error creating staged request:', error);
      res.status(500).json({ 
        error: 'Failed to create staged request',
        details: error.message
      });
    }
  },

  async updateStagedRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const stagedRequest = await StagedRequest.findByPk(id);

      if (!stagedRequest) {
        return res.status(404).json({ error: 'Staged request not found' });
      }

      stagedRequest.status = status;
      await stagedRequest.save();

      res.status(200).json({
        message: 'Staged request status updated successfully',
        stagedRequest
      });
    } catch (error) {
      console.error('Error updating staged request status:', error);
      res.status(500).json({ 
        error: 'Failed to update staged request status',
        details: error.message
      });
    }
  }
};

module.exports = stagedRequestController;
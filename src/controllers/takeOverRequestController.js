const { 
  TakeOverRequest, 
  ServiceRequestBundle, 
  User, 
  Task, 
  HouseService, 
  sequelize 
} = require('../models');
const { v4: uuidv4 } = require('uuid');

const takeOverRequestController = {
  async createTakeOverRequest(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { 
        serviceName,
        accountNumber, 
        monthlyAmount,
        dueDate,
        requiredUpfrontPayment,
        userId,
        isFixedService // Boolean flag to determine if this is a fixed expense
      } = req.body;
  
      // Determine service and bundle types based on isFixedService flag
      const serviceType = isFixedService ? 'fixed' : 'variable';
      const bundleType = isFixedService ? 'fixed_recurring' : 'variable_recurring';
      // Map to HouseService type
      const houseServiceType = isFixedService ? 'fixed_recurring' : 'variable_recurring';
  
      // Validate input - requirements vary based on service type
      if (!serviceName || !accountNumber || !dueDate || !userId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      // For fixed services, monthlyAmount is required
      if (isFixedService && !monthlyAmount) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Monthly amount is required for fixed services' });
      }
  
      // Fetch user and their houseId
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.houseId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'User must be part of a house' });
      }
  
      // Calculate createDay or reminderDay based on service type
      let createDay = null;
      let reminderDay = null;
      
      if (dueDate) {
        const dueDateNum = parseInt(dueDate, 10);
        
        if (isFixedService) {
          // For fixed recurring: Calculate createDay (approximately 2 weeks before dueDay)
          createDay = (dueDateNum + 16) % 31;
          if (createDay === 0) createDay = 31;
        } else {
          // For variable recurring: Calculate reminderDay (approximately 1 week before dueDay)
          reminderDay = dueDateNum - 7;
          if (reminderDay <= 0) reminderDay = reminderDay + 30;
        }
      }
  
      console.log('Creating TakeOverRequest with data:', {
        serviceName,
        accountNumber,
        monthlyAmount: isFixedService ? monthlyAmount : null,
        dueDate,
        requiredUpfrontPayment: requiredUpfrontPayment || 0,
        serviceType,
        status: 'pending'
      });
  
      // Create the TakeOverRequest
      const takeOverRequest = await TakeOverRequest.create({
        serviceName,
        accountNumber,
        monthlyAmount: isFixedService ? monthlyAmount : null, // Only set for fixed services
        dueDate,
        requiredUpfrontPayment: requiredUpfrontPayment || 0,
        serviceType,
        status: 'pending'
      }, { transaction });
  
      // Create the ServiceRequestBundle with metadata including createDay or reminderDay
      const metadata = isFixedService
        ? { createDay }
        : { reminderDay };
  
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        takeOverRequestId: takeOverRequest.id,
        status: 'pending',
        totalPaidUpfront: 0,
        type: bundleType,
        metadata
      }, { transaction });
      
      // Generate houseTabzAgreementId
      const houseTabzAgreementId = uuidv4();
      
      // Create HouseService with pending status
      const houseService = await HouseService.create({
        houseTabzAgreementId,
        name: serviceName,
        type: houseServiceType,
        billingSource: 'housetabz',
        status: 'pending',
        houseId: user.houseId,
        serviceRequestBundleId: serviceRequestBundle.id,
        accountNumber,
        amount: isFixedService ? monthlyAmount : null,
        dueDay: parseInt(dueDate, 10),
        createDay: isFixedService ? createDay : null,
        reminderDay: !isFixedService ? reminderDay : null,
        designatedUserId: userId,
        feeCategory: 'card',
        metadata: {
          serviceType
        }
      }, { transaction });
  
      // Fetch all roommates including the creator
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId },
        transaction
      });
  
      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const individualPaymentAmount = requiredUpfrontPayment ? 
        (requiredUpfrontPayment / totalRoommates).toFixed(2) : null;
      
      // Calculate individual monthly payment for fixed services
      const individualMonthlyAmount = isFixedService && monthlyAmount ? 
        (parseFloat(monthlyAmount) / totalRoommates).toFixed(2) : null;
  
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
          monthlyAmount: individualMonthlyAmount, // Add monthly amount to each task
          paymentStatus: paymentRequired ? 'pending' : 'not_required'
        };
      });
  
      console.log('Creating tasks with monthly amount:', {
        individualMonthlyAmount,
        totalRoommates,
        isFixedService,
        totalMonthlyAmount: monthlyAmount
      });
  
      const createdTasks = await Task.bulkCreate(tasks, { transaction, individualHooks: true });

      
      // Commit transaction
      await transaction.commit();
  
      // Build detailed takeOverRequest object that the frontend expects
      const detailedTakeOverRequest = {
        serviceName,
        accountNumber,
        monthlyAmount: isFixedService ? monthlyAmount : null,
        dueDate,
        requiredUpfrontPayment: requiredUpfrontPayment || 0,
        serviceType,
        createDay: isFixedService ? createDay : null,
        reminderDay: !isFixedService ? reminderDay : null
      };
  
      res.status(201).json({
        message: 'Take over request and service request bundle created successfully',
        takeOverRequest: detailedTakeOverRequest,
        takeOverRequestId: takeOverRequest.id,
        serviceRequestBundleId: serviceRequestBundle.id,
        houseServiceId: houseService.id,
        houseTabzAgreementId,
        tasks: createdTasks.length,
        serviceType,
        createDay,
        reminderDay
      });
    } catch (error) {
      await transaction.rollback();
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
              model: HouseService,
              as: 'houseService'
            }
          ]
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
            },
            {
              model: HouseService,
              as: 'houseService'
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

      const takeOverRequest = await TakeOverRequest.findByPk(id, {
        include: [
          {
            model: ServiceRequestBundle,
            as: 'serviceRequestBundle',
            include: [
              {
                model: HouseService,
                as: 'houseService'
              }
            ]
          }
        ]
      });

      if (!takeOverRequest) {
        return res.status(404).json({ error: 'Take over request not found' });
      }

      await takeOverRequest.update({ status });

      // If status is rejected and there's a HouseService, update it too
      if (status === 'rejected' && 
          takeOverRequest.serviceRequestBundle &&
          takeOverRequest.serviceRequestBundle.houseService) {
        
        await takeOverRequest.serviceRequestBundle.houseService.update({ status: 'cancelled' });
      }

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

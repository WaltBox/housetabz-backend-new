// src/controllers/stagedRequestController.js
const { 
  StagedRequest, 
  ServiceRequestBundle, 
  User, 
  Task, 
  Partner,
  HouseService,
  sequelize
} = require('../models');
const { v4: uuidv4 } = require('uuid');
const webhookService = require('../services/webhookService');

const stagedRequestController = {
  
  async createStagedRequest(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { 
        transactionId, 
        serviceName, 
        serviceType,
        estimatedAmount,
        requiredUpfrontPayment,
        userId,
        externalAgreementId
      } = req.body;
      const { partnerId } = req.params;
   
      // Validate input
      if (!transactionId || !serviceName || !serviceType || !userId || !partnerId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing required fields' });
      }
   
      // Fetch the partner
      const partner = await Partner.findByPk(partnerId, { transaction });
      if (!partner) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Partner not found' });
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
      }, { transaction });
   
      // Create the ServiceRequestBundle
      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId: user.houseId,
        userId,
        stagedRequestId: stagedRequest.id,
        status: 'pending',
        totalPaidUpfront: 0,
        type: 'marketplace_onetime'
      }, { transaction });
   
      // Generate houseTabzAgreementId
      const houseTabzAgreementId = uuidv4();
      
      // Map service type to HouseService type
      let houseServiceType = 'one_time'; // Default
      if (serviceType === 'energy' || serviceType === 'internet' || serviceType === 'water') {
        houseServiceType = 'variable_recurring';
      }
   
      // Create HouseService with pending status
      const houseService = await HouseService.create({
        houseTabzAgreementId,
        externalAgreementId: externalAgreementId || null,
        name: serviceName,
        type: houseServiceType,
        billingSource: 'partner',
        status: 'pending',
        houseId: user.houseId,
        partnerId: partner.id,
        serviceRequestBundleId: serviceRequestBundle.id,
        metadata: {
          transactionId,
          serviceType,
          estimatedAmount
        }
      }, { transaction });
   
      // Fetch all roommates including the creator
      const allRoommates = await User.findAll({
        where: { houseId: user.houseId },
        transaction
      });
   
      // Calculate individual payment if required
      const totalRoommates = allRoommates.length;
      const individualPaymentAmount = upfrontAmount ? 
        (upfrontAmount / totalRoommates).toFixed(2) : null;
   
      // Create tasks for all roommates
      const tasks = allRoommates.map((roommate) => {
        const isCreator = String(roommate.id) === String(userId);
        const paymentRequired = !!upfrontAmount;
   
        return {
          userId: roommate.id,
          serviceRequestBundleId: serviceRequestBundle.id,
          type: 'service_request',
          status: isCreator ? !paymentRequired : false, // Only true for creator if no payment needed
          response: isCreator ? 'accepted' : 'pending',
          paymentRequired,
          paymentAmount: individualPaymentAmount,
          paymentStatus: paymentRequired ? 'pending' : 'not_required'
        };
      });
   
      // Create all tasks in the database
      const createdTasks = await Task.bulkCreate(tasks, { transaction, individualHooks: true });

   
      // Commit transaction
      await transaction.commit();
   
      // Send agreement.created webhook (after transaction is committed)
    
      // Send agreement.created webhook (after transaction is committed)
try {
  const webhookPayload = {
    event: 'agreement.created',
    houseTabzAgreementId,
    externalAgreementId: externalAgreementId || null,
    transactionId,
    serviceName,
    serviceType,
    estimatedAmount: estimatedAmount || null,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  
  console.log(`Attempting to send agreement.created webhook for transaction ${transactionId}:`, webhookPayload);
  
  const webhookResult = await webhookService.sendWebhook(
    partnerId,
    'agreement.created',
    webhookPayload
  );
  
  console.log('Webhook result:', webhookResult);
} catch (error) {
  console.error('Error sending agreement.created webhook:', error);
}
      
   
      res.status(201).json({
        message: 'Staged request and service request bundle created successfully',
        stagedRequestId: stagedRequest.id,
        serviceRequestBundleId: serviceRequestBundle.id,
        houseServiceId: houseService.id,
        houseTabzAgreementId
      });
    } catch (error) {
      await transaction.rollback();
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

      const stagedRequest = await StagedRequest.findByPk(id, {
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

      if (!stagedRequest) {
        return res.status(404).json({ error: 'Staged request not found' });
      }

      await stagedRequest.update({ status });

      // If status is rejected and there's a HouseService, update it too
      if (status === 'rejected' && 
          stagedRequest.serviceRequestBundle &&
          stagedRequest.serviceRequestBundle.houseService) {
        
        await stagedRequest.serviceRequestBundle.houseService.update({ status: 'cancelled' });
        
        // Send request.rejected webhook
        try {
          const houseService = stagedRequest.serviceRequestBundle.houseService;
          await webhookService.sendWebhook(
            stagedRequest.partnerId,
            'request.rejected',
            {
              event: 'request.rejected',
              houseTabzAgreementId: houseService.houseTabzAgreementId,
              externalAgreementId: houseService.externalAgreementId,
              status: 'rejected',
              reason: 'Roommate rejected the request'
            }
          );
        } catch (error) {
          console.error('Error sending request.rejected webhook:', error);
        }
      }

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
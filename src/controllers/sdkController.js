// src/controllers/sdkController.js
const { HouseService, Partner } = require('../models');
const webhookService = require('../services/webhookService');

exports.checkHouseServiceStatus = async (req, res) => {
  try {
    const { partnerId, houseId } = req.body;
    
    console.log('🔍 SDK Controller - Checking status for:', { partnerId, houseId });
    
    // Validate inputs
    if (!partnerId || !houseId) {
      console.log('❌ Missing required fields:', { partnerId, houseId });
      return res.status(400).json({ error: 'partnerId and houseId required' });
    }
    
    // Check if house service exists
    console.log('🔍 Searching for existing service...');
    const existingService = await HouseService.findOne({
      where: { partnerId, houseId },
      include: [{ model: Partner, as: 'partner' }]
    });
    
    console.log('🔍 Query result:', existingService ? 'Service found' : 'No service found');
    
    if (existingService) {
      const result = {
        exists: true,
        agreementId: existingService.houseTabzAgreementId,
        status: existingService.status,
        serviceName: existingService.name,
        partnerName: existingService.partner.name
      };
      
      console.log('✅ Returning existing service:', result);
      return res.json(result);
    }
    
    console.log('✅ No existing service, returning exists: false');
    res.json({ exists: false });
  } catch (error) {
    console.error('❌ SDK Controller Error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to check status' });
  }
};

exports.resendWebhook = async (req, res) => {
  try {
    const { agreementId, transactionId } = req.body;
    
    console.log('🔄 Resending webhook for:', { agreementId, transactionId });
    
    // Validate inputs
    if (!agreementId || !transactionId) {
      console.log('❌ Missing required fields:', { agreementId, transactionId });
      return res.status(400).json({ error: 'agreementId and transactionId required' });
    }
    
    // Find existing HouseService
    console.log('🔍 Finding HouseService by agreementId...');
    const existingService = await HouseService.findOne({
      where: { houseTabzAgreementId: agreementId },
      include: [{ model: Partner, as: 'partner' }]
    });
    
    if (!existingService) {
      console.log('❌ HouseService not found for agreementId:', agreementId);
      return res.status(404).json({ error: 'HouseService not found' });
    }
    
    console.log('✅ Found HouseService:', {
      id: existingService.id,
      name: existingService.name,
      status: existingService.status,
      partnerId: existingService.partnerId
    });
    
    // Prepare webhook payload using existing service data
    const webhookPayload = {
      event: 'agreement.created',
      houseTabzAgreementId: existingService.houseTabzAgreementId,
      externalAgreementId: existingService.externalAgreementId || null,
      transactionId: transactionId, // Use new transaction ID
      serviceName: existingService.name,
      serviceType: existingService.type,
      estimatedAmount: existingService.amount || 0,
      status: 'pending', // Always send as pending for resend
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending webhook with payload:', webhookPayload);
    
    // Send webhook to partner
    const webhookResult = await webhookService.sendWebhook(
      existingService.partnerId,
      'agreement.created',
      webhookPayload
    );
    
    console.log('✅ Webhook sent successfully:', webhookResult);
    
    res.json({ 
      success: true, 
      message: 'Webhook resent successfully',
      agreementId: existingService.houseTabzAgreementId
    });
    
  } catch (error) {
    console.error('❌ Resend webhook error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to resend webhook' });
  }
};
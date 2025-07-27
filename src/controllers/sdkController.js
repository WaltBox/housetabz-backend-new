// src/controllers/sdkController.js
const { HouseService, Partner } = require('../models');
const webhookService = require('../services/webhookService');

exports.checkHouseServiceStatus = async (req, res) => {
  try {
    const { partnerId, houseId } = req.body;
    
 
    
    // Validate inputs
    if (!partnerId || !houseId) {

      return res.status(400).json({ error: 'partnerId and houseId required' });
    }
    
    // Check if house service exists
  
    const existingService = await HouseService.findOne({
      where: { partnerId, houseId },
      include: [{ model: Partner, as: 'partner' }]
    });

    
    if (existingService) {
      const result = {
        exists: true,
        agreementId: existingService.houseTabzAgreementId,
        status: existingService.status,
        serviceName: existingService.name,
        partnerName: existingService.partner.name
      };
      
    
      return res.json(result);
    }
    
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
    

    
    // Validate inputs
    if (!agreementId || !transactionId) {

      return res.status(400).json({ error: 'agreementId and transactionId required' });
    }
    
    // Find existing HouseService

    const existingService = await HouseService.findOne({
      where: { houseTabzAgreementId: agreementId },
      include: [{ model: Partner, as: 'partner' }]
    });
    
    if (!existingService) {
     
      return res.status(404).json({ error: 'HouseService not found' });
    }
    

    
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
  
    
    // Send webhook to partner
    const webhookResult = await webhookService.sendWebhook(
      existingService.partnerId,
      'agreement.created',
      webhookPayload
    );
    
    
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
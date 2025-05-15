const axios = require('axios');

// Use your webhook.site testing URL
const TEST_WEBHOOK_URL = 'https://webhook.site/a466ffeb-dbee-4fe7-b027-9b27343339f9';

let models = null;

const webhookService = {
  async sendWebhook(partnerId, eventType, data) {
    // Lazy load models
    if (!models) {
      models = require('../models');
    }
    
    console.log(`WebhookService.sendWebhook called with partnerId=${partnerId}, eventType=${eventType}`);
    
    // Build standard payload based on event type
    const payload = this.buildPayload(eventType, data);
    
    try {
      // Send to webhook.site
      console.log(`Sending ${eventType} webhook to test URL: ${TEST_WEBHOOK_URL}`);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post(TEST_WEBHOOK_URL, payload);
      
      // Try to log it
      console.log('Creating webhook log entry');
      try {
        const webhookLog = await models.WebhookLog.create({
          partner_id: partnerId,
          event_type: eventType,
          payload,
          status: 'success',
          status_code: response.status,
          response: response.data || {}
        });
        console.log(`Created webhook log with ID ${webhookLog.id}`);
      } catch (logError) {
        console.error('Error creating webhook log:', logError);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Webhook error:', error);
      
      // Try to log the failure
      try {
        await models.WebhookLog.create({
          partner_id: partnerId,
          event_type: eventType,
          payload,
          status: 'failed',
          error: error.message
        });
      } catch (logError) {
        console.error('Error logging webhook failure:', logError);
      }
      
      return { success: false, error: error.message };
    }
  },
  
  // Format payload based on event type
  buildPayload(eventType, data) {
    // Base payload structure
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString()
    };
    
    // Add fields specific to each event type
    switch (eventType) {
      case 'agreement.created':
        return {
          ...payload,
          houseTabzAgreementId: data.houseTabzAgreementId,
          externalAgreementId: data.externalAgreementId || null,
          transactionId: data.transactionId,
          serviceName: data.serviceName,
          serviceType: data.serviceType,
          estimatedAmount: data.estimatedAmount || null,
          status: 'pending'
        };
        
      case 'request.authorized':
        return {
          ...payload,
          houseTabzAgreementId: data.houseTabzAgreementId,
          externalAgreementId: data.externalAgreementId || null,
          transactionId: data.transactionId,
          status: 'authorized',
          serviceName: data.serviceName,
          serviceType: data.serviceType
        };
        
      case 'request.rejected':
        return {
          ...payload,
          houseTabzAgreementId: data.houseTabzAgreementId,
          externalAgreementId: data.externalAgreementId || null,
          status: 'rejected',
          reason: data.reason || 'Request rejected by user'
        };
      
      case 'bill.paid':
        return {
          ...payload,
          houseTabzAgreementId: data.houseTabzAgreementId,
          externalAgreementId: data.externalAgreementId || null,
          externalBillId: data.externalBillId,
          amountPaid: data.amount,
          paymentDate: data.paymentDate || new Date().toISOString()
        };
        
      default:
        return { ...payload, ...data };
    }
  }
};

module.exports = webhookService;
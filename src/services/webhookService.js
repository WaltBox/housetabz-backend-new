const axios = require('axios');
const crypto = require('crypto');

let models = null;

const webhookService = {
  async sendWebhook(partnerId, eventType, data) {
    // Lazy load models
    if (!models) {
      models = require('../models');
    }
        
    console.log(`WebhookService.sendWebhook called with partnerId=${partnerId}, eventType=${eventType}`);
    
    // Find the partner and check their webhook configuration
    const partner = await models.Partner.findByPk(partnerId);
    
    if (!partner || !partner.webhookUrl || !partner.webhookEnabled) {
      console.log(`Partner ${partnerId} has no webhook configured or webhooks disabled`);
      
      // Still log the attempt for tracking
      try {
        await models.WebhookLog.create({
          partner_id: partnerId,
          event_type: eventType,
          payload: this.buildPayload(eventType, data),
          status: 'failed',
          error: 'Webhook not configured or disabled'
        });
      } catch (logError) {
        console.error('Error logging webhook failure:', logError);
      }
      
      return { success: false, reason: 'webhook_not_configured' };
    }
    
    // Build standard payload based on event type
    const payload = this.buildPayload(eventType, data);
    
    try {
      // Generate signature headers using partner's webhook secret
      const headers = this.signPayload(payload, partner.webhookSecret);
      
      // Add content type
      headers['Content-Type'] = 'application/json';
      
      // Log the attempt
      console.log(`Sending ${eventType} webhook to partner URL: ${partner.webhookUrl}`);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      // Send webhook to the partner's configured URL (NOT the test URL!)
      const response = await axios.post(partner.webhookUrl, payload, { 
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      // Log the successful webhook attempt
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
          error: error.message,
          status_code: error.response?.status || null
        });
      } catch (logError) {
        console.error('Error logging webhook failure:', logError);
      }
      
      return { success: false, error: error.message };
    }
  },
  
  // 🔒 NEW: Sign the payload for security verification
  signPayload(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadString}`;
    
    // Strip whsec_ prefix if present (common for Stripe-style webhook secrets)
    const cleanSecret = secret.startsWith('whsec_') ? secret.substring(6) : secret;
    
    const signature = crypto
      .createHmac('sha256', cleanSecret)
      .update(signedPayload)
      .digest('hex');
    
    return {
      'HouseTabz-Timestamp': timestamp.toString(),
      'HouseTabz-Signature': `sha256=${signature}`
    };
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
          amountPaid: data.amountPaid, // 🔧 FIXED: was data.amount
          paymentDate: data.paymentDate || new Date().toISOString()
        };
              
      default:
        return { ...payload, ...data };
    }
  }
};

module.exports = webhookService;
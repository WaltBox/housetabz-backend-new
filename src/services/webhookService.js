// src/services/webhookService.js

let models = null;

const webhookService = {
  async sendWebhook(partnerId, eventType, data) {
    try {
      // Lazy load models only when needed
      if (!models) {
        models = require('../models');
      }

      console.log('Creating webhook log for partner:', partnerId, 'event:', eventType);

      const payload = {
        event: eventType,
        ...data,
        timestamp: new Date().toISOString(),
      };

      try {
        const webhookLog = await models.WebhookLog.create({
          partner_id: partnerId, // Corrected field to match your model definition
          event_type: eventType, // Corrected field to match your model definition
          payload,
          status: 'success',
          status_code: 200, // Corrected field to match your model definition
          response: {
            message: 'Webhook log created successfully',
            timestamp: new Date().toISOString(),
          },
        });

        console.log('Successfully created webhook log:', webhookLog.id);
        return true;
      } catch (logError) {
        console.error('Failed to create webhook log:', logError.message);
        return false;
      }
    } catch (error) {
      console.error('Webhook service error:', error.message);
      return false;
    }
  },
};

module.exports = webhookService;

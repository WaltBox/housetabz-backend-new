// src/utils/urgentMessageScheduler.js
const cron = require('node-cron');
const {
  generateChargeOverdueMessages,
  generateFundingMissingMessages
} = require('../services/urgentMessageService');

/**
 * Start the urgent‑message schedulers
 */
function startUrgentMessageSchedulers() {
  console.log('Starting urgent message schedulers');

  // 1) Charge‐overdue & funding‐missing job — every day at 2:30 AM CT
  cron.schedule('30 7 * * *', async () => {
    console.log('Running urgent message generation');
    try {
      // We can call both in parallel or in sequence
      await generateChargeOverdueMessages();
      await generateFundingMissingMessages();
      console.log('Urgent message generation complete');
    } catch (error) {
      console.error('Error generating urgent messages:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });

  console.log('Urgent message schedulers started');
}

module.exports = { startUrgentMessageSchedulers };

// src/utils/urgentMessageScheduler.js
const cron = require('node-cron');
const {
  refreshUrgentMessages
} = require('../services/urgentMessageService');

/**
 * Start the urgent‑message schedulers
 */
function startUrgentMessageSchedulers() {
  console.log('Starting urgent message schedulers');

  // 1) Full refresh — every 4 hours for comprehensive updates
  cron.schedule('0 */4 * * *', async () => {
    console.log('Running full urgent message refresh (every 4 hours)');
    try {
      await refreshUrgentMessages();
      console.log('Full urgent message refresh complete');
    } catch (error) {
      console.error('Error in full urgent message refresh:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });

  // 2) Quick refresh — every hour for more frequent updates
  cron.schedule('0 * * * *', async () => {
    console.log('Running quick urgent message refresh (hourly)');
    try {
      await refreshUrgentMessages();
      console.log('Quick urgent message refresh complete');
    } catch (error) {
      console.error('Error in quick urgent message refresh:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });

  console.log('Urgent message schedulers started - running every 4 hours (full) and every hour (quick)');
}

module.exports = { startUrgentMessageSchedulers };

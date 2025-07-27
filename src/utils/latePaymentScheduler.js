// src/utils/latePaymentScheduler.js
const cron = require('node-cron');
const { processLateCharges } = require('../workers/latePaymentWorker');

let latePaymentJob = null;

/**
 * Start the late payment processing scheduler
 * Runs every day at 2 AM to check for late charges and update HSI
 */
function startLatePaymentScheduler() {
  if (latePaymentJob) {
 
    return;
  }

  // Run daily at 2 AM - '0 2 * * *'
  // For testing every 2 hours: '0 */2 * * *'
  // For testing every 5 minutes: '*/5 * * * *'
  latePaymentJob = cron.schedule('0 2 * * *', async () => {
  
    try {
      const result = await processLateCharges();
   
    } catch (error) {
    
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust to your timezone
  });


}

/**
 * Stop the late payment scheduler
 */
function stopLatePaymentScheduler() {
  if (latePaymentJob) {
    latePaymentJob.destroy();
    latePaymentJob = null;
   
  }
}

/**
 * Manually trigger late payment processing (for testing)
 */
async function triggerLatePaymentProcessing() {

  try {
    const result = await processLateCharges();
   
    return result;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  startLatePaymentScheduler,
  stopLatePaymentScheduler,
  triggerLatePaymentProcessing
};
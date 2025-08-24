// src/utils/billScheduler.js
const cron = require('node-cron');
const billService = require('../services/billService');

/**
 * Start the bill generation schedulers
 */
function startBillSchedulers() {
  console.log('Starting bill schedulers');

  // Run fixed recurring bill generation every day at 2 AM
  cron.schedule('0 12 * * *', async () => {
    console.log('Running scheduled fixed recurring bill generation');
    try {
      const result = await billService.generateFixedRecurringBills();
      console.log('Fixed recurring bill generation complete:', result);
    } catch (error) {
      console.error('Error in scheduled fixed recurring bill generation:', error);
    }
  });

  // Run variable service reminders every day at 3 AM
  cron.schedule('5 12 * * *', async () => {
    console.log('Running scheduled variable service reminders');
    try {
      const result = await billService.generateVariableServiceReminders();
      console.log('Variable service reminders complete:', result);
    } catch (error) {
      console.error('Error in scheduled variable service reminders:', error);
    }
  });
  
  // Run bill submission request generation every day at 4 AM
  cron.schedule('10 12 * * *', async () => {
    console.log('Running scheduled variable bill submission request generation');
    try {
      const result = await billService.generateVariableBillSubmissionRequests();
      console.log('Variable bill submission request generation complete:', result);
    } catch (error) {
      console.error('Error in scheduled variable bill submission request generation:', error);
    }
  });
  
  // Run bill submission reminders every day at 5 AM
  cron.schedule('15 12 * * *', async () => {
    console.log('Running scheduled bill submission reminders');
    try {
      const result = await billService.generateBillSubmissionReminders();
      console.log('Bill submission reminders complete:', result);
    } catch (error) {
      console.error('Error in scheduled bill submission reminders:', error);
    }
  });

  // CRITICAL SAFEGUARD: Check for missing bill submissions every day at 6 AM
  cron.schedule('20 12 * * *', async () => {
    console.log('🔍 Running CRITICAL SAFEGUARD: Missing bill submission check');
    try {
      const result = await billService.checkAndCreateMissingBillSubmissions();
      console.log('Missing bill submission check complete:', result);
      
      // Log critical alerts if any submissions were created
      if (result.createdCount > 0) {
        console.error(`🚨 ALERT: ${result.createdCount} missing bill submissions were created by safeguard!`);
      }
    } catch (error) {
      console.error('❌ CRITICAL ERROR in missing bill submission safeguard:', error);
    }
  });

  console.log('Bill schedulers started (including critical safeguards)');
}

module.exports = {
  startBillSchedulers
};
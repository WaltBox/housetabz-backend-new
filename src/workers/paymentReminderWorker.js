// src/workers/paymentReminderWorker.js - Payment Reminder Scheduler
const cron = require('node-cron');
const paymentReminderService = require('../services/paymentReminderService');

/**
 * Payment Reminder Worker
 * Schedules and runs payment reminders to prevent late payments
 * Separates personal notifications (noon) from social notifications (5pm)
 */
class PaymentReminderWorker {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
    this.lastRun = null;
    this.runCount = 0;
    this.stats = {
      totalReminders: 0,
      personalReminders: 0,
      socialReminders: 0,
      advanceReminders: 0,
      overdueReminders: 0,
      roommateAlerts: 0,
      advanceInsufficientAlerts: 0,
      errors: 0
    };
  }

  /**
   * Start the payment reminder scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Payment reminder worker is already running');
      return;
    }

    console.log('🚀 Starting Payment Reminder Worker...');
    this.isRunning = true;

    // Schedule personal notifications - runs at 12:00 PM CST daily
    // Personal stuff: user's own payments, bills, charges
    const personalJob = cron.schedule('0 12 * * *', async () => {
      console.log('👤 Running personal notification check...');
      await this.runPersonalReminders();
    }, {
      scheduled: true,
      timezone: 'America/Chicago'
    });

    // Schedule social notifications - runs at 5:00 PM CST daily  
    // Social stuff: roommate alerts, house warnings, social pressure
    const socialJob = cron.schedule('0 17 * * *', async () => {
      console.log('🏠 Running social notification check...');
      await this.runSocialReminders();
    }, {
      scheduled: true,
      timezone: 'America/Chicago'
    });

    // Schedule evening check - runs at 8:00 PM CST daily
    // Light check for urgent items only
    const eveningJob = cron.schedule('0 20 * * *', async () => {
      console.log('🌆 Running evening urgent check...');
      await this.runUrgentCheck();
    }, {
      scheduled: true,
      timezone: 'America/Chicago'
    });

    this.jobs = [personalJob, socialJob, eveningJob];
    
    console.log('✅ Payment reminder worker started (Central Time)');
    console.log('📋 Schedule:');
    console.log('   - 12:00 PM CST: Personal notifications (your own stuff)');
    console.log('   - 5:00 PM CST: Social notifications (roommate stuff)');
    console.log('   - 8:00 PM CST: Evening urgent check');
    
    // Run initial check after startup (all types)
    setTimeout(() => {
      this.runPaymentReminders('all');
    }, 10000); // 10 seconds after startup
  }

  /**
   * Stop the payment reminder scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Payment reminder worker is not running');
      return;
    }

    console.log('🛑 Stopping Payment Reminder Worker...');
    
    this.jobs.forEach(job => {
      job.destroy();
    });
    
    this.jobs = [];
    this.isRunning = false;
    
    console.log('✅ Payment reminder worker stopped');
  }

  /**
   * Run personal reminders (user's own stuff)
   */
  async runPersonalReminders() {
    if (!this.isRunning) {
      console.log('⏸️ Payment reminder worker is stopped, skipping personal run');
      return;
    }

    const startTime = new Date();
    this.runCount++;
    
    try {
      console.log(`👤 Starting personal reminder run #${this.runCount} at ${startTime.toISOString()}`);
      
      // Run personal reminders only
      const results = await paymentReminderService.sendPersonalReminders();
      
      // Update stats
      this.stats.personalReminders++;
      this.stats.advanceReminders += results.advanceReminders;
      this.stats.overdueReminders += results.overdueReminders;
      this.stats.errors += results.errors.length;
      
      const endTime = new Date();
      const duration = endTime - startTime;
      this.lastRun = endTime;
      
      console.log(`✅ Personal reminder run #${this.runCount} completed in ${duration}ms`);
      console.log(`📊 Personal Results:`, {
        advanceReminders: results.advanceReminders,
        overdueReminders: results.overdueReminders,
        errors: results.errors.length
      });
      
      // Log any errors
      if (results.errors.length > 0) {
        console.error('❌ Personal reminder errors:', results.errors);
      }
      
    } catch (error) {
      console.error('❌ Error in personal reminder worker:', error);
      this.stats.errors++;
    }
  }

  /**
   * Run social reminders (roommate stuff)
   */
  async runSocialReminders() {
    if (!this.isRunning) {
      console.log('⏸️ Payment reminder worker is stopped, skipping social run');
      return;
    }

    const startTime = new Date();
    this.runCount++;
    
    try {
      console.log(`🏠 Starting social reminder run #${this.runCount} at ${startTime.toISOString()}`);
      
      // Run social reminders only
      const results = await paymentReminderService.sendSocialReminders();
      
      // Update stats
      this.stats.socialReminders++;
      this.stats.roommateAlerts += results.roommateAlerts;
      this.stats.advanceInsufficientAlerts += results.advanceInsufficientAlerts;
      this.stats.errors += results.errors.length;
      
      const endTime = new Date();
      const duration = endTime - startTime;
      this.lastRun = endTime;
      
      console.log(`✅ Social reminder run #${this.runCount} completed in ${duration}ms`);
      console.log(`📊 Social Results:`, {
        roommateAlerts: results.roommateAlerts,
        advanceInsufficientAlerts: results.advanceInsufficientAlerts,
        errors: results.errors.length
      });
      
      // Log any errors
      if (results.errors.length > 0) {
        console.error('❌ Social reminder errors:', results.errors);
      }
      
    } catch (error) {
      console.error('❌ Error in social reminder worker:', error);
      this.stats.errors++;
    }
  }

  /**
   * Run urgent check (evening check for time-sensitive items)
   */
  async runUrgentCheck() {
    if (!this.isRunning) {
      console.log('⏸️ Payment reminder worker is stopped, skipping urgent check');
      return;
    }

    const startTime = new Date();
    
    try {
      console.log(`🚨 Starting urgent check at ${startTime.toISOString()}`);
      
      // Only run advance reminders for items due tomorrow (urgent only)
      const results = await paymentReminderService.sendAdvanceReminders();
      
      // Filter to only urgent items (due in 1 day)
      const urgentCount = results.sent; // This should be filtered in the service to only urgent items
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      console.log(`✅ Urgent check completed in ${duration}ms`);
      console.log(`📊 Urgent Results: ${urgentCount} urgent reminders sent`);
      
      // Trigger urgent message updates
      await paymentReminderService.triggerUrgentMessageUpdates();
      
    } catch (error) {
      console.error('❌ Error in urgent check:', error);
    }
  }

  /**
   * Run the payment reminder check (legacy method for manual runs)
   */
  async runPaymentReminders(type = 'all') {
    if (!this.isRunning) {
      console.log('⏸️ Payment reminder worker is stopped, skipping run');
      return;
    }

    const startTime = new Date();
    this.runCount++;
    
    try {
      console.log(`🔔 Starting payment reminder run #${this.runCount} (${type}) at ${startTime.toISOString()}`);
      
      // Run payment reminders
      const results = await paymentReminderService.sendPaymentReminders(type);
      
      // Update stats
      this.stats.totalReminders += results.advanceReminders + results.overdueReminders + results.roommateAlerts + results.advanceInsufficientAlerts;
      this.stats.advanceReminders += results.advanceReminders;
      this.stats.overdueReminders += results.overdueReminders;
      this.stats.roommateAlerts += results.roommateAlerts;
      this.stats.advanceInsufficientAlerts += results.advanceInsufficientAlerts;
      this.stats.errors += results.errors.length;
      
      // Trigger urgent message updates after sending reminders
      await paymentReminderService.triggerUrgentMessageUpdates();
      
      const endTime = new Date();
      const duration = endTime - startTime;
      this.lastRun = endTime;
      
      console.log(`✅ Payment reminder run #${this.runCount} completed in ${duration}ms`);
      console.log(`📊 Results:`, {
        advanceReminders: results.advanceReminders,
        overdueReminders: results.overdueReminders,
        roommateAlerts: results.roommateAlerts,
        advanceInsufficientAlerts: results.advanceInsufficientAlerts,
        errors: results.errors.length
      });
      
      // Log any errors
      if (results.errors.length > 0) {
        console.error('❌ Payment reminder errors:', results.errors);
      }
      
    } catch (error) {
      console.error('❌ Error in payment reminder worker:', error);
      this.stats.errors++;
    }
  }

  /**
   * Run reminders immediately (for testing/manual triggers)
   */
  async runNow(type = 'all') {
    console.log(`🔄 Running payment reminders immediately (${type})...`);
    
    if (type === 'personal') {
      await this.runPersonalReminders();
    } else if (type === 'social') {
      await this.runSocialReminders();
    } else {
      await this.runPaymentReminders(type);
    }
  }

  /**
   * Get worker status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      runCount: this.runCount,
      lastRun: this.lastRun,
      stats: this.stats,
      nextRuns: this.jobs.map(job => ({
        scheduled: job.scheduled,
        expression: job.cronExpression
      }))
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalReminders: 0,
      personalReminders: 0,
      socialReminders: 0,
      advanceReminders: 0,
      overdueReminders: 0,
      roommateAlerts: 0,
      advanceInsufficientAlerts: 0,
      errors: 0
    };
    this.runCount = 0;
    console.log('📊 Payment reminder worker stats reset');
  }
}

// Create and export singleton instance
const paymentReminderWorker = new PaymentReminderWorker();

module.exports = paymentReminderWorker; 
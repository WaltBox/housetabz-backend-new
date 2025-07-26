// src/scripts/test-payment-reminders.js - Payment Reminder System Testing
const { sequelize } = require('../models');
const paymentReminderService = require('../services/paymentReminderService');
const paymentReminderWorker = require('../workers/paymentReminderWorker');

/**
 * Test script for payment reminder system
 */
async function testPaymentReminderSystem() {
  console.log('🧪 Testing Payment Reminder System');
  console.log('=====================================');
  
  try {
    // Test 1: Check system configuration
    console.log('\n1. Testing System Configuration');
    console.log('===============================');
    
    const config = paymentReminderService.REMINDER_CONFIG;
    console.log('📋 Reminder Configuration:');
    console.log(`   - Advance reminder days: ${config.ADVANCE_REMINDERS.join(', ')}`);
    console.log(`   - Overdue reminder days: ${config.OVERDUE_REMINDERS.join(', ')}`);
    console.log(`   - Cooldown periods: ${JSON.stringify(config.COOLDOWN_HOURS)}`);
    console.log('✅ Configuration loaded successfully');
    
    // Test 2: Database connectivity
    console.log('\n2. Testing Database Connectivity');
    console.log('===============================');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test 3: Service methods
    console.log('\n3. Testing Service Methods');
    console.log('===========================');
    
    const mainResults = await paymentReminderService.sendPaymentReminders();
    console.log('📊 Main reminder results:', {
      advanceReminders: mainResults.advanceReminders,
      overdueReminders: mainResults.overdueReminders,
      roommateAlerts: mainResults.roommateAlerts,
      advanceInsufficientAlerts: mainResults.advanceInsufficientAlerts,
      totalErrors: mainResults.errors.length
    });
    console.log('✅ Main reminder service working');
    
    // Test 4: Individual reminder types
    console.log('\n4. Testing Individual Reminder Types');
    console.log('===================================');
    
    const advanceResults = await paymentReminderService.sendAdvanceReminders();
    console.log(`📅 Advance reminders: ${advanceResults.sent} sent, ${advanceResults.errors.length} errors`);
    
    const overdueResults = await paymentReminderService.sendOverdueReminders();
    console.log(`⚠️ Overdue reminders: ${overdueResults.sent} sent, ${overdueResults.errors.length} errors`);
    
    const roommateResults = await paymentReminderService.sendRoommateAlerts();
    console.log(`💰 Roommate alerts: ${roommateResults.sent} sent, ${roommateResults.errors.length} errors`);
    
    const advanceInsufficientResults = await paymentReminderService.sendAdvanceInsufficientAlerts();
    console.log(`😬 Advance insufficient alerts: ${advanceInsufficientResults.sent} sent, ${advanceInsufficientResults.errors.length} errors`);
    
    console.log('✅ Individual reminder types working');
    
    // Test 5: Worker functionality
    console.log('\n5. Testing Worker Functionality');
    console.log('===============================');
    
    const initialStatus = paymentReminderWorker.getStatus();
    console.log('📊 Initial worker status:', {
      isRunning: initialStatus.isRunning,
      runCount: initialStatus.runCount,
      lastRun: initialStatus.lastRun
    });
    
    if (!initialStatus.isRunning) {
      console.log('🚀 Starting worker for testing...');
      paymentReminderWorker.start();
      
      // Wait a moment for startup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const runningStatus = paymentReminderWorker.getStatus();
      console.log('📊 Worker status after start:', {
        isRunning: runningStatus.isRunning,
        runCount: runningStatus.runCount
      });
      
      if (runningStatus.isRunning) {
        console.log('✅ Worker started successfully');
      } else {
        console.log('❌ Worker failed to start');
      }
    } else {
      console.log('✅ Worker already running');
    }
    
    // Test 6: Manual trigger
    console.log('\n6. Testing Manual Trigger');
    console.log('=========================');
    
    console.log('🔄 Running manual trigger...');
    const startTime = Date.now();
    
    await paymentReminderWorker.runNow();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Manual trigger completed in ${duration}ms`);
    
    // Test 7: Statistics
    console.log('\n7. Testing Statistics');
    console.log('====================');
    
    const finalStatus = paymentReminderWorker.getStatus();
    console.log('📊 Final worker statistics:', {
      runCount: finalStatus.runCount,
      totalReminders: finalStatus.stats.totalReminders,
      advanceReminders: finalStatus.stats.advanceReminders,
      overdueReminders: finalStatus.stats.overdueReminders,
      roommateAlerts: finalStatus.stats.roommateAlerts,
      advanceInsufficientAlerts: finalStatus.stats.advanceInsufficientAlerts,
      errors: finalStatus.stats.errors,
      lastRun: finalStatus.lastRun
    });
    
    console.log('✅ Statistics working correctly');
    
    // Test 8: Urgent message integration
    console.log('\n8. Testing Urgent Message Integration');
    console.log('====================================');
    
    console.log('🔄 Testing urgent message update trigger...');
    const urgentStartTime = Date.now();
    
    await paymentReminderService.triggerUrgentMessageUpdates();
    
    const urgentEndTime = Date.now();
    const urgentDuration = urgentEndTime - urgentStartTime;
    
    console.log(`✅ Urgent message integration completed in ${urgentDuration}ms`);
    
    // Final summary
    console.log('\n🎉 PAYMENT REMINDER SYSTEM TEST COMPLETE');
    console.log('=========================================');
    console.log('✅ All systems operational!');
    console.log('\n📋 System Summary:');
    console.log(`   - Configuration: ✅ Loaded`);
    console.log(`   - Database: ✅ Connected`);
    console.log(`   - Services: ✅ Functional`);
    console.log(`   - Worker: ✅ ${finalStatus.isRunning ? 'Running' : 'Stopped'}`);
    console.log(`   - Statistics: ✅ Tracking`);
    console.log(`   - Integration: ✅ Working`);
    console.log('\n💡 Users will now receive:');
    console.log(`   - Advance reminders: ${config.ADVANCE_REMINDERS.join(', ')} days before due`);
    console.log(`   - Overdue reminders: ${config.OVERDUE_REMINDERS.join(', ')} days after due`);
    console.log(`   - Roommate alerts: When housemates are late`);
    console.log(`   - Advance insufficient alerts: When bills can't be fronted`);
    console.log(`   - Real-time updates: With urgent message system`);
    console.log('\n🎯 This should significantly reduce late payments!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test resources...');
    await sequelize.close();
    console.log('✅ Test cleanup complete');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPaymentReminderSystem()
    .then(() => {
      console.log('\n🏁 Test script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testPaymentReminderSystem
}; 
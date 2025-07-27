// scripts/test-late-payments.js
require('dotenv').config();

const { sequelize } = require('../models');
const { triggerLatePaymentProcessing } = require('../utils/latePaymentScheduler');

async function runLatePaymentTest() {
  try {
    console.log('🚀 TESTING LATE PAYMENT PROCESSING');
    console.log('===================================\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Run late payment processing
    console.log('🔄 Starting late payment processing...\n');
    const result = await triggerLatePaymentProcessing();
    
    console.log('\n📊 RESULTS:');
    console.log('===========');
    console.log(`Charges processed: ${result.processed}`);
    console.log(`Users affected: ${result.usersAffected || 0}`);
    console.log(`Total points deducted: ${result.totalPointsDeducted || 0}`);
    console.log(`Status: ${result.message}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await sequelize.close();
  process.exit(0);
});

// Run the test
runLatePaymentTest();
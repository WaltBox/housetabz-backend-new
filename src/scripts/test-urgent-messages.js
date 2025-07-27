// src/scripts/test-urgent-messages.js
const { sequelize } = require('../models');
const urgentMessageService = require('../services/urgentMessageService');
const { Charge, User, UrgentMessage } = require('../models');

async function testUrgentMessageSystem() {
  try {
    console.log('🧪 Testing Real-time Urgent Message System...\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Test 1: Full system refresh
    console.log('📝 Test 1: Full system refresh');
    await urgentMessageService.refreshUrgentMessages();
    console.log('✅ Full refresh completed\n');
    
    // Test 2: Check current urgent messages
    console.log('📝 Test 2: Check current urgent messages');
    const currentMessages = await UrgentMessage.findAll({
      where: { isResolved: false },
      include: ['User', 'bill', 'charge']
    });
    console.log(`📊 Found ${currentMessages.length} active urgent messages:`);
    currentMessages.forEach(msg => {
      console.log(`  - User ${msg.user_id}: ${msg.type} - ${msg.title}`);
    });
    console.log();
    
    // Test 3: Simulate payment update
    console.log('📝 Test 3: Simulating payment update');
    const unpaidCharges = await Charge.findAll({
      where: { status: 'unpaid' },
      limit: 3
    });
    
    if (unpaidCharges.length > 0) {
      console.log(`🔄 Testing with ${unpaidCharges.length} unpaid charges:`);
      unpaidCharges.forEach(charge => {
        console.log(`  - Charge ${charge.id}: User ${charge.userId}, Amount $${charge.amount}`);
      });
      
      // Simulate payment update
      await urgentMessageService.updateUrgentMessagesForPayment({
        chargeIds: unpaidCharges.map(c => c.id),
        userId: unpaidCharges[0].userId,
        paymentId: 999 // Mock payment ID
      });
      console.log('✅ Payment simulation completed\n');
    } else {
      console.log('📊 No unpaid charges found to test with\n');
    }
    
    // Test 4: Test house-specific refresh
    console.log('📝 Test 4: House-specific refresh');
    const testUser = await User.findByPk(5); // Walt's user
    if (testUser && testUser.houseId) {
      await urgentMessageService.refreshUrgentMessagesForHouse(testUser.houseId);
      console.log(`✅ House ${testUser.houseId} refresh completed\n`);
    } else {
      console.log('❌ No test user found\n');
    }
    
    // Test 5: Check messages after updates
    console.log('📝 Test 5: Check messages after updates');
    const updatedMessages = await UrgentMessage.findAll({
      where: { isResolved: false },
      include: ['User', 'bill', 'charge']
    });
    console.log(`📊 Found ${updatedMessages.length} active urgent messages after updates:`);
    updatedMessages.forEach(msg => {
      console.log(`  - User ${msg.user_id}: ${msg.type} - ${msg.title}`);
    });
    console.log();
    
    // Test 6: Performance test
    console.log('📝 Test 6: Performance test');
    const startTime = Date.now();
    await urgentMessageService.refreshUrgentMessages();
    const endTime = Date.now();
    console.log(`⚡ Full refresh took ${endTime - startTime}ms\n`);
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testUrgentMessageSystem();
}

module.exports = testUrgentMessageSystem; 
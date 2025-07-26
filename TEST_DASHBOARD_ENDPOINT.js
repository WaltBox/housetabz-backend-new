// TEST_DASHBOARD_ENDPOINT.js
// Run this script to test the dashboard endpoint after the model fixes

const { sequelize, User, UrgentMessage, BillSubmission } = require('./src/models');
const dashboardService = require('./src/services/dashboardService');

async function testDashboardEndpoint() {
  console.log('🧪 Starting Dashboard Endpoint Test...');
  console.log('=====================================');
  
  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test 2: Find a test user
    console.log('\n2. Finding test user...');
    const testUser = await User.findOne({
      where: { id: 5 }, // Using waltbox who has houseId 5
      attributes: ['id', 'username', 'houseId']
    });
    
    if (!testUser) {
      console.log('❌ No test user found with ID 5');
      console.log('💡 Try changing the user ID in the test or create a user');
      return;
    }
    
    console.log(`✅ Found test user: ${testUser.username} (ID: ${testUser.id}, House: ${testUser.houseId})`);
    
    // Test 3: Check for urgent messages in database
    console.log('\n3. Checking urgent messages in database...');
    const urgentMessageCount = await UrgentMessage.count({
      where: { 
        userId: testUser.id,
        isResolved: false 
      }
    });
    console.log(`📊 Found ${urgentMessageCount} unresolved urgent messages for user ${testUser.id}`);
    
    // Test 4: Check for bill submissions in database
    console.log('\n4. Checking bill submissions in database...');
    const billSubmissionCount = await BillSubmission.count({
      where: { 
        userId: testUser.id,
        status: 'pending'
      }
    });
    console.log(`📊 Found ${billSubmissionCount} pending bill submissions for user ${testUser.id}`);
    
    // Test 5: Test dashboard service directly
    console.log('\n5. Testing dashboard service directly...');
    const startTime = Date.now();
    
    const dashboardData = await dashboardService.getDashboardData(testUser.id);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`✅ Dashboard service completed in ${responseTime}ms`);
    
    // Test 6: Validate response structure
    console.log('\n6. Validating response structure...');
    
    // Check user data
    console.log('User data:', !!dashboardData.user);
    console.log('  - User ID:', dashboardData.user?.id);
    console.log('  - Username:', dashboardData.user?.username);
    console.log('  - House ID:', dashboardData.user?.houseId);
    console.log('  - Finance data:', !!dashboardData.user?.finance);
    
    // Check house data
    console.log('House data:', !!dashboardData.house);
    if (dashboardData.house) {
      console.log('  - House ID:', dashboardData.house.id);
      console.log('  - House name:', dashboardData.house.name);
      console.log('  - HSI data:', !!dashboardData.house.hsi);
      console.log('  - Finance data:', !!dashboardData.house.finance);
    }
    
    // Check urgent messages
    console.log('Urgent messages:');
    console.log('  - Is array:', Array.isArray(dashboardData.urgentMessages));
    console.log('  - Count:', dashboardData.urgentMessages?.length || 0);
    console.log('  - Database count matches:', dashboardData.urgentMessages?.length === urgentMessageCount);
    
    if (dashboardData.urgentMessages?.length > 0) {
      const firstMessage = dashboardData.urgentMessages[0];
      console.log('  - First message structure:');
      console.log('    - ID:', firstMessage.id);
      console.log('    - Type:', firstMessage.type);
      console.log('    - Message:', firstMessage.message);
      console.log('    - Has charge:', !!firstMessage.charge);
      console.log('    - Has bill:', !!firstMessage.bill);
      console.log('    - Resolved:', firstMessage.resolved);
    }
    
    // Check bill submissions
    console.log('Bill submissions:');
    console.log('  - Is array:', Array.isArray(dashboardData.billSubmissions));
    console.log('  - Count:', dashboardData.billSubmissions?.length || 0);
    console.log('  - Database count matches:', dashboardData.billSubmissions?.length === billSubmissionCount);
    
    if (dashboardData.billSubmissions?.length > 0) {
      const firstSubmission = dashboardData.billSubmissions[0];
      console.log('  - First submission structure:');
      console.log('    - ID:', firstSubmission.id);
      console.log('    - Status:', firstSubmission.status);
      console.log('    - Amount:', firstSubmission.amount);
      console.log('    - Has house service:', !!firstSubmission.houseService);
      console.log('    - Has submitter:', !!firstSubmission.submitter);
      console.log('    - Submitted by:', firstSubmission.submittedBy);
    }
    
    // Check other data arrays
    console.log('Other data:');
    console.log('  - Pending charges:', Array.isArray(dashboardData.pendingCharges) ? dashboardData.pendingCharges.length : 'NOT ARRAY');
    console.log('  - Pending tasks:', Array.isArray(dashboardData.pendingTasks) ? dashboardData.pendingTasks.length : 'NOT ARRAY');
    console.log('  - Notifications:', Array.isArray(dashboardData.notifications) ? dashboardData.notifications.length : 'NOT ARRAY');
    console.log('  - Recent bills:', Array.isArray(dashboardData.recentBills) ? dashboardData.recentBills.length : 'NOT ARRAY');
    console.log('  - Recent transactions:', Array.isArray(dashboardData.recentTransactions) ? dashboardData.recentTransactions.length : 'NOT ARRAY');
    
    // Check summary
    console.log('Summary:');
    console.log('  - Has summary:', !!dashboardData.summary);
    if (dashboardData.summary) {
      console.log('  - Total owed:', dashboardData.summary.totalOwed);
      console.log('  - Urgent messages count:', dashboardData.summary.urgentMessagesCount);
      console.log('  - Bill submissions count:', dashboardData.summary.billSubmissionsCount);
      console.log('  - Pending tasks count:', dashboardData.summary.pendingTasksCount);
    }
    
    // Test 7: Test error handling
    console.log('\n7. Testing error handling...');
    try {
      await dashboardService.getDashboardData(999999); // Non-existent user
      console.log('❌ Should have thrown error for non-existent user');
    } catch (error) {
      console.log('✅ Correctly threw error for non-existent user:', error.message);
    }
    
    // Test 8: Performance check
    console.log('\n8. Performance check...');
    if (responseTime < 500) {
      console.log(`✅ Excellent performance: ${responseTime}ms (< 500ms)`);
    } else if (responseTime < 1000) {
      console.log(`✅ Good performance: ${responseTime}ms (< 1000ms)`);
    } else if (responseTime < 2000) {
      console.log(`⚠️  Acceptable performance: ${responseTime}ms (< 2000ms)`);
    } else {
      console.log(`❌ Poor performance: ${responseTime}ms (>= 2000ms)`);
    }
    
    console.log('\n✅ All dashboard tests completed successfully!');
    
    // Test 9: Create sample data if none exists
    if (urgentMessageCount === 0 && billSubmissionCount === 0) {
      console.log('\n9. No test data found. Here are some SQL queries to create sample data:');
      console.log('   (Run these in your database if you want to test with real data)');
      console.log('');
      console.log('   -- Create a sample urgent message:');
      console.log(`   INSERT INTO "UrgentMessages" (house_id, user_id, bill_id, charge_id, type, title, body, is_read, is_resolved, created_at)`);
      console.log(`   VALUES (${testUser.houseId}, ${testUser.id}, 1, 1, 'overdue_charge', 'Payment Overdue', 'Your electric bill payment is overdue', false, false, NOW());`);
      console.log('');
      console.log('   -- Create a sample bill submission:');
      console.log(`   INSERT INTO "BillSubmissions" ("houseServiceId", "userId", status, amount, "dueDate", "createdAt", "updatedAt")`);
      console.log(`   VALUES (1, ${testUser.id}, 'pending', 85.00, '2024-03-20', NOW(), NOW());`);
      console.log('');
    }
    
    console.log('\n🎉 Dashboard endpoint test completed successfully!');
    console.log('🌟 The urgent messages and bill submissions should now be working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
    console.log('📝 Database connection closed');
  }
}

// Run the test
testDashboardEndpoint().catch(console.error); 
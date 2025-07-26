// src/scripts/test-api-performance.js - API Performance Testing
const axios = require('axios');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateAccessToken } = require('../middleware/auth/tokenUtils');

// Get models from sequelize instance
const User = sequelize.models.User;
const House = sequelize.models.House;

// Test configuration
const API_BASE_URL = 'http://localhost:3004'; // Adjust if different

/**
 * Measure API response time
 */
async function measureApiResponse(endpoint, options = {}) {
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method: options.method || 'GET',
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.data,
      timeout: 30000 // 30 second timeout
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: true,
      responseTime,
      statusCode: response.status,
      dataSize: JSON.stringify(response.data).length,
      endpoint,
      data: response.data
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: false,
      responseTime,
      statusCode: error.response?.status || 0,
      error: error.message,
      endpoint
    };
  }
}

/**
 * Main performance test
 */
async function runPerformanceTest() {
  console.log('🚀 API Performance Test Suite');
  console.log('===============================');
  console.log(`Testing against: ${API_BASE_URL}`);
  
  const allResults = [];
  
  try {
    // First, find a valid user and house ID to test with
    console.log('\n🔍 Finding test user and house...');
    const testUser = await User.findOne({ 
      where: { houseId: { [Op.not]: null } },
      include: [{ model: House, as: 'house' }]
    });
    
    if (!testUser) {
      console.log('❌ No users found in database for testing');
      return;
    }
    
    const actualUserId = testUser.id;
    const actualHouseId = testUser.houseId;
    
    console.log(`   ✅ Using User ID: ${actualUserId} (${testUser.username})`);
    console.log(`   ✅ Using House ID: ${actualHouseId} (${testUser.house?.name || 'Unknown'})`);
    
    // Update test configuration dynamically
    const testConfig = {
      API_BASE_URL,
      TEST_USER_ID: actualUserId,
      TEST_HOUSE_ID: actualHouseId
    };
    
    // Run all tests with actual IDs
    const dashboardResults = await testDashboardPerformanceWithConfig(testConfig);
    const houseServiceResults = await testHouseServicePerformanceWithConfig(testConfig);
    const otherResults = await testOtherEndpointsWithConfig(testConfig);
    
    allResults.push(...dashboardResults, ...houseServiceResults, ...otherResults);
    
    // Generate summary
    generatePerformanceSummary(allResults);
    
    console.log('\n✅ Performance testing completed!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await sequelize.close();
  }
}

/**
 * Test dashboard performance with dynamic config
 */
async function testDashboardPerformanceWithConfig(config) {
  console.log('\n📊 Testing Dashboard Performance');
  console.log('=================================');
  
  const results = [];
  
  // Generate test auth token
  const authToken = generateAccessToken(config.TEST_USER_ID);
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  // Test 1: User Dashboard
  console.log('\n1. Testing User Dashboard...');
  const dashboardResult = await measureApiResponse(`/api/dashboard/user/${config.TEST_USER_ID}`, { headers: authHeaders });
  results.push(dashboardResult);
  
  if (dashboardResult.success) {
    console.log(`   ✅ Dashboard loaded in ${dashboardResult.responseTime}ms`);
    console.log(`   📦 Data size: ${(dashboardResult.dataSize / 1024).toFixed(2)}KB`);
    console.log(`   📋 Data includes:`);
    
    const data = dashboardResult.data;
    if (data.user) console.log(`      - User info: ${data.user.username}`);
    if (data.pendingCharges) console.log(`      - Pending charges: ${data.pendingCharges.length} charges ($${data.pendingCharges.reduce((sum, c) => sum + parseFloat(c.amount), 0).toFixed(2)})`);
    if (data.urgentMessages) console.log(`      - Urgent messages: ${data.urgentMessages.length} messages`);
    if (data.billSubmissions) console.log(`      - Bill submissions: ${data.billSubmissions.length} submissions`);
    if (data.recentPayments) console.log(`      - Recent payments: ${data.recentPayments.length} payments`);
    if (data.houseInfo) console.log(`      - House info: ${data.houseInfo.name} (HSI: ${data.houseInfo.hsi?.score || 'N/A'})`);
  } else {
    console.log(`   ❌ Dashboard failed in ${dashboardResult.responseTime}ms: ${dashboardResult.error}`);
  }
  
  return results;
}

/**
 * Test house service performance with dynamic config
 */
async function testHouseServicePerformanceWithConfig(config) {
  console.log('\n🏠 Testing House Service Performance');
  console.log('====================================');
  
  const results = [];
  
  // Generate test auth token
  const authToken = generateAccessToken(config.TEST_USER_ID);
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  // Test 1: House Services List
  console.log('\n1. Testing House Services List...');
  const servicesResult = await measureApiResponse(`/api/house-services/house/${config.TEST_HOUSE_ID}`, { headers: authHeaders });
  results.push(servicesResult);
  
  if (servicesResult.success) {
    console.log(`   ✅ House services loaded in ${servicesResult.responseTime}ms`);
    console.log(`   📦 Data size: ${(servicesResult.dataSize / 1024).toFixed(2)}KB`);
    console.log(`   📋 Found ${servicesResult.data.length} services`);
    
    servicesResult.data.forEach((service, index) => {
      if (index < 3) { // Show first 3 services
        console.log(`      - ${service.name}: $${service.monthlyAmount} (${service.category})`);
      }
    });
    if (servicesResult.data.length > 3) {
      console.log(`      - ...and ${servicesResult.data.length - 3} more services`);
    }
  } else {
    console.log(`   ❌ House services failed in ${servicesResult.responseTime}ms: ${servicesResult.error}`);
  }
  
  // Test 2: House Service Details (if we have services)
  if (servicesResult.success && servicesResult.data.length > 0) {
    console.log('\n2. Testing House Service Details...');
    const serviceId = servicesResult.data[0].id;
    const serviceDetailResult = await measureApiResponse(`/api/house-services/${serviceId}`, { headers: authHeaders });
    results.push(serviceDetailResult);
    
    if (serviceDetailResult.success) {
      console.log(`   ✅ Service details loaded in ${serviceDetailResult.responseTime}ms`);
      console.log(`   📦 Data size: ${(serviceDetailResult.dataSize / 1024).toFixed(2)}KB`);
      console.log(`   📋 Service: ${serviceDetailResult.data.name}`);
    } else {
      console.log(`   ❌ Service details failed in ${serviceDetailResult.responseTime}ms: ${serviceDetailResult.error}`);
    }
  }
  
  return results;
}

/**
 * Test other critical endpoints with dynamic config
 */
async function testOtherEndpointsWithConfig(config) {
  console.log('\n🔧 Testing Other Critical Endpoints');
  console.log('===================================');
  
  const results = [];
  
  // Generate test auth token
  const authToken = generateAccessToken(config.TEST_USER_ID);
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  // Test 1: User Profile
  console.log('\n1. Testing User Profile...');
  const userResult = await measureApiResponse(`/api/users/${config.TEST_USER_ID}`, { headers: authHeaders });
  results.push(userResult);
  
  if (userResult.success) {
    console.log(`   ✅ User profile loaded in ${userResult.responseTime}ms`);
    console.log(`   📦 Data size: ${(userResult.dataSize / 1024).toFixed(2)}KB`);
  } else {
    console.log(`   ❌ User profile failed in ${userResult.responseTime}ms: ${userResult.error}`);
  }
  
  // Test 2: House Details (no auth required)
  console.log('\n2. Testing House Details...');
  const houseResult = await measureApiResponse(`/api/houses/${config.TEST_HOUSE_ID}`);
  results.push(houseResult);
  
  if (houseResult.success) {
    console.log(`   ✅ House details loaded in ${houseResult.responseTime}ms`);
    console.log(`   📦 Data size: ${(houseResult.dataSize / 1024).toFixed(2)}KB`);
  } else {
    console.log(`   ❌ House details failed in ${houseResult.responseTime}ms: ${houseResult.error}`);
  }
  
  // Test 3: Bills for house (using correct endpoint)
  console.log('\n3. Testing Bills List...');
  const billsResult = await measureApiResponse(`/api/bills/${config.TEST_HOUSE_ID}/bills`, { headers: authHeaders });
  results.push(billsResult);
  
  if (billsResult.success) {
    console.log(`   ✅ Bills list loaded in ${billsResult.responseTime}ms`);
    console.log(`   📦 Data size: ${(billsResult.dataSize / 1024).toFixed(2)}KB`);
    console.log(`   📋 Found ${billsResult.data.length} bills`);
  } else {
    console.log(`   ❌ Bills list failed in ${billsResult.responseTime}ms: ${billsResult.error}`);
  }
  
  return results;
}

/**
 * Generate performance summary
 */
function generatePerformanceSummary(allResults) {
  console.log('\n📈 Performance Summary');
  console.log('======================');
  
  const successful = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);
  
  console.log(`\n🎯 Overall Results:`);
  console.log(`   - Successful requests: ${successful.length}/${allResults.length}`);
  console.log(`   - Failed requests: ${failed.length}/${allResults.length}`);
  
  if (successful.length > 0) {
    const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
    const minResponseTime = Math.min(...successful.map(r => r.responseTime));
    const maxResponseTime = Math.max(...successful.map(r => r.responseTime));
    
    console.log(`\n⏱️  Response Times:`);
    console.log(`   - Average: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   - Fastest: ${minResponseTime}ms`);
    console.log(`   - Slowest: ${maxResponseTime}ms`);
    
    console.log(`\n🚀 Performance Grades:`);
    successful.forEach(result => {
      let grade = '🟢 Excellent';
      if (result.responseTime > 1000) grade = '🔴 Slow';
      else if (result.responseTime > 500) grade = '🟡 Moderate';
      else if (result.responseTime > 200) grade = '🟠 Good';
      
      console.log(`   - ${result.endpoint}: ${result.responseTime}ms ${grade}`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Requests:`);
    failed.forEach(result => {
      console.log(`   - ${result.endpoint}: ${result.error}`);
    });
  }
  
  console.log(`\n💡 Performance Recommendations:`);
  const slowRequests = successful.filter(r => r.responseTime > 500);
  if (slowRequests.length === 0) {
    console.log(`   - 🎉 All endpoints are performing well! (<500ms)`);
  } else {
    console.log(`   - Consider optimizing these slow endpoints:`);
    slowRequests.forEach(r => {
      console.log(`     * ${r.endpoint}: ${r.responseTime}ms`);
    });
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runPerformanceTest()
    .then(() => {
      console.log('\n🏁 Performance test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTest, measureApiResponse }; 
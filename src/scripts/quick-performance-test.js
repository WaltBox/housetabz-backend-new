// src/scripts/quick-performance-test.js - Quick Performance Check
const axios = require('axios');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateAccessToken } = require('../middleware/auth/tokenUtils');

// Get models from sequelize instance
const User = sequelize.models.User;
const House = sequelize.models.House;

const API_BASE_URL = 'http://localhost:3004';

async function quickPerformanceTest() {
  console.log('⚡ Quick Performance Test');
  console.log('========================');
  
  try {
    // Find test user
    const testUser = await User.findOne({ 
      where: { houseId: { [Op.not]: null } },
      include: [{ model: House, as: 'house' }]
    });
    
    if (!testUser) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`Testing with User: ${testUser.username} (ID: ${testUser.id})`);
    console.log(`Testing with House: ${testUser.house?.name} (ID: ${testUser.houseId})`);
    
    const authToken = generateAccessToken(testUser.id);
    const authHeaders = { 'Authorization': `Bearer ${authToken}` };
    
    // Test 1: Dashboard (3 times to see consistency)
    console.log('\n🎯 Dashboard Performance (3 runs):');
    for (let i = 1; i <= 3; i++) {
      const start = Date.now();
      try {
        const response = await axios.get(`${API_BASE_URL}/api/dashboard/user/${testUser.id}`, { headers: authHeaders });
        const time = Date.now() - start;
        console.log(`   Run ${i}: ${time}ms ✅`);
        if (i === 1) {
          console.log(`   📦 Data size: ${(JSON.stringify(response.data).length / 1024).toFixed(2)}KB`);
        }
      } catch (error) {
        const time = Date.now() - start;
        console.log(`   Run ${i}: ${time}ms ❌ ${error.response?.status || error.message}`);
      }
    }
    
    // Test 2: House Services (corrected endpoint)
    console.log('\n🏠 House Services Performance:');
    const start = Date.now();
    try {
      const response = await axios.get(`${API_BASE_URL}/api/houseServices/house/${testUser.houseId}`, { headers: authHeaders });
      const time = Date.now() - start;
      console.log(`   ✅ ${time}ms - Found ${response.data.length} services`);
      console.log(`   📦 Data size: ${(JSON.stringify(response.data).length / 1024).toFixed(2)}KB`);
    } catch (error) {
      const time = Date.now() - start;
      console.log(`   ❌ ${time}ms - ${error.response?.status || error.message}`);
    }
    
    console.log('\n✅ Quick test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  quickPerformanceTest()
    .then(() => {
      console.log('\n🏁 Quick test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Quick test failed:', error);
      process.exit(1);
    });
}

module.exports = { quickPerformanceTest }; 
const axios = require('axios');
const { performance } = require('perf_hooks');

// Production API base URL
const PRODUCTION_API = 'https://api.housetabz.com/api';
const LOCAL_API = 'http://localhost:3004/api';

// Test configuration
const TEST_CONFIG = {
  // Test users (these should be valid user IDs in production)
  userIds: [5, 6, 8],
  
  // Test endpoints
  endpoints: [
    '/dashboard/user/{userId}',
    '/dashboard/user/{userId}/summary',
    '/users/{userId}/notifications'
  ],
  
  // Number of test iterations
  iterations: 3
};

// Test credentials - you'll need to provide valid auth tokens
const TEST_AUTH = {
  // You can get these from your app's login response
  production: {
    // Format: 'Bearer your-jwt-token-here'
    token: null, // Set this to test with auth
  },
  local: {
    token: null, // Set this to test with auth
  }
};

async function testEndpoint(baseUrl, endpoint, userId, authToken) {
  const url = `${baseUrl}${endpoint.replace('{userId}', userId)}`;
  const startTime = performance.now();
  
  try {
    const headers = {};
    if (authToken) {
      headers.Authorization = authToken;
    }
    
    const response = await axios.get(url, { 
      headers,
      timeout: 30000 // 30 second timeout
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      success: true,
      status: response.status,
      duration: Math.round(duration),
      dataSize: JSON.stringify(response.data).length,
      endpoint,
      userId
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      success: false,
      status: error.response?.status || 'timeout',
      duration: Math.round(duration),
      error: error.message,
      endpoint,
      userId
    };
  }
}

async function runPerformanceTest() {
  console.log('🚀 Starting Dashboard Performance Test');
  console.log('=====================================');
  
  const results = {
    production: [],
    local: []
  };
  
  // Test production endpoints
  console.log('\n📊 Testing Production (api.housetabz.com)...');
  for (const endpoint of TEST_CONFIG.endpoints) {
    for (const userId of TEST_CONFIG.userIds) {
      console.log(`\n Testing ${endpoint} for user ${userId}...`);
      
      for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const result = await testEndpoint(
          PRODUCTION_API,
          endpoint,
          userId,
          TEST_AUTH.production.token
        );
        
        results.production.push(result);
        
        if (result.success) {
          console.log(`   ✅ Iteration ${i + 1}: ${result.duration}ms (${result.dataSize} bytes)`);
        } else {
          console.log(`   ❌ Iteration ${i + 1}: ${result.status} - ${result.error} (${result.duration}ms)`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // Test local endpoints (if available)
  console.log('\n📊 Testing Local (localhost:3004)...');
  for (const endpoint of TEST_CONFIG.endpoints) {
    for (const userId of TEST_CONFIG.userIds) {
      console.log(`\n Testing ${endpoint} for user ${userId}...`);
      
      for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        const result = await testEndpoint(
          LOCAL_API,
          endpoint,
          userId,
          TEST_AUTH.local.token
        );
        
        results.local.push(result);
        
        if (result.success) {
          console.log(`   ✅ Iteration ${i + 1}: ${result.duration}ms (${result.dataSize} bytes)`);
        } else {
          console.log(`   ❌ Iteration ${i + 1}: ${result.status} - ${result.error} (${result.duration}ms)`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // Generate summary report
  console.log('\n📈 Performance Summary');
  console.log('======================');
  
  const generateSummary = (results, environment) => {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (successful.length === 0) {
      console.log(`\n${environment.toUpperCase()}:`);
      console.log(`  ❌ All requests failed (${failed.length} failures)`);
      return;
    }
    
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log(`\n${environment.toUpperCase()}:`);
    console.log(`  ✅ Successful requests: ${successful.length}`);
    console.log(`  ❌ Failed requests: ${failed.length}`);
    console.log(`  ⏱️  Average response time: ${Math.round(avgDuration)}ms`);
    console.log(`  🏃 Fastest response: ${minDuration}ms`);
    console.log(`  🐌 Slowest response: ${maxDuration}ms`);
    
    // Group by endpoint
    const byEndpoint = {};
    successful.forEach(r => {
      if (!byEndpoint[r.endpoint]) {
        byEndpoint[r.endpoint] = [];
      }
      byEndpoint[r.endpoint].push(r.duration);
    });
    
    console.log('\n  📍 By Endpoint:');
    Object.keys(byEndpoint).forEach(endpoint => {
      const times = byEndpoint[endpoint];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`     ${endpoint}: ${Math.round(avg)}ms avg`);
    });
  };
  
  generateSummary(results.production, 'production');
  generateSummary(results.local, 'local');
  
  // Performance comparison
  const prodSuccessful = results.production.filter(r => r.success);
  const localSuccessful = results.local.filter(r => r.success);
  
  if (prodSuccessful.length > 0 && localSuccessful.length > 0) {
    const prodAvg = prodSuccessful.reduce((a, b) => a + b.duration, 0) / prodSuccessful.length;
    const localAvg = localSuccessful.reduce((a, b) => a + b.duration, 0) / localSuccessful.length;
    const ratio = Math.round(prodAvg / localAvg);
    
    console.log('\n⚡ Performance Comparison:');
    console.log(`   Production is ${ratio}x slower than local`);
    console.log(`   Difference: ${Math.round(prodAvg - localAvg)}ms`);
  }
  
  console.log('\n🏁 Test completed!');
}

// Auth helper function
function setAuthToken(environment, token) {
  TEST_AUTH[environment].token = token;
  console.log(`✅ Auth token set for ${environment}`);
}

// Quick test without auth (for public endpoints)
async function quickTest() {
  console.log('🚀 Quick Dashboard Test (No Auth)');
  console.log('=================================');
  
  const endpoints = [
    '/dashboard/user/5',
    '/dashboard/user/5/summary'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting ${endpoint}...`);
    
    const result = await testEndpoint(PRODUCTION_API, endpoint, null, null);
    
    if (result.success) {
      console.log(`✅ ${result.duration}ms - Status: ${result.status}`);
    } else {
      console.log(`❌ ${result.duration}ms - Status: ${result.status} - ${result.error}`);
    }
  }
}

// Export functions for use
module.exports = {
  runPerformanceTest,
  setAuthToken,
  quickTest,
  testEndpoint
};

// Run if called directly
if (require.main === module) {
  console.log('Dashboard Performance Test Script');
  console.log('================================');
  console.log('Usage:');
  console.log('  node test_dashboard_performance.js quick    - Quick test without auth');
  console.log('  node test_dashboard_performance.js full     - Full test with auth');
  console.log('');
  
  const mode = process.argv[2];
  
  if (mode === 'quick') {
    quickTest();
  } else if (mode === 'full') {
    runPerformanceTest();
  } else {
    console.log('Please specify "quick" or "full" mode');
  }
} 
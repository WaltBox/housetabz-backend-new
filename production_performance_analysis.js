const axios = require('axios');
const { performance } = require('perf_hooks');

// Production credentials for user 8
const PRODUCTION_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwiaWF0IjoxNzUyNDQ4NDgyLCJleHAiOjE3NTUwNDA0ODJ9.UTRx_v5VEdaGUG8mFrf-aYNzCYu8riS74slWmA4yNE0';
const PRODUCTION_API = 'https://api.housetabz.com/api';
const LOCAL_API = 'http://localhost:3004/api';

class ProductionAnalyzer {
  constructor() {
    this.results = [];
  }

  async testEndpoint(baseUrl, endpoint, authToken = null, name = null) {
    const url = `${baseUrl}${endpoint}`;
    const startTime = performance.now();
    
    try {
      const headers = authToken ? { Authorization: authToken } : {};
      
      const response = await axios.get(url, { 
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: response.status === 200,
        status: response.status,
        duration: Math.round(duration),
        dataSize: response.data ? JSON.stringify(response.data).length : 0,
        endpoint: name || endpoint,
        url: baseUrl
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: false,
        status: error.response?.status || 'timeout',
        duration: Math.round(duration),
        dataSize: 0,
        endpoint: name || endpoint,
        url: baseUrl,
        error: error.message
      };
    }
  }

  async runDashboardAnalysis() {
    console.log('🚀 HouseTabz Production Performance Analysis');
    console.log('=============================================');
    console.log('User ID: 8');
    console.log('');

    const testCases = [
      { 
        name: 'Dashboard Full', 
        endpoint: '/dashboard/user/8', 
        auth: true,
        description: 'Complete dashboard with all data'
      },
      { 
        name: 'Dashboard Summary', 
        endpoint: '/dashboard/user/8/summary', 
        auth: true,
        description: 'Lightweight dashboard summary'
      },
      { 
        name: 'User Notifications', 
        endpoint: '/users/8/notifications', 
        auth: true,
        description: 'User notification list'
      },
      { 
        name: 'User Profile', 
        endpoint: '/users/8', 
        auth: true,
        description: 'Basic user data'
      },
      { 
        name: 'Payment Methods', 
        endpoint: '/payment-methods', 
        auth: true,
        description: 'User payment methods'
      },
      { 
        name: 'Waitlist (Public)', 
        endpoint: '/waitlist', 
        auth: false,
        description: 'Public waitlist endpoint'
      }
    ];

    const iterations = 3;
    const allResults = [];

    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log(`   ${testCase.description}`);
      console.log('   ' + '─'.repeat(50));

      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await this.testEndpoint(
          PRODUCTION_API,
          testCase.endpoint,
          testCase.auth ? PRODUCTION_TOKEN : null,
          testCase.name
        );
        
        results.push(result);
        allResults.push(result);
        
        if (result.success) {
          console.log(`   ✅ Run ${i + 1}: ${result.duration}ms (${result.dataSize} bytes)`);
        } else {
          console.log(`   ❌ Run ${i + 1}: ${result.duration}ms - Status: ${result.status}`);
        }
        
        // Small delay between requests
        if (i < iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Calculate statistics for this endpoint
      const successful = results.filter(r => r.success);
      if (successful.length > 0) {
        const durations = successful.map(r => r.duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        console.log(`   📊 Average: ${Math.round(avg)}ms | Range: ${min}-${max}ms`);
      }
    }

    // Generate comprehensive report
    this.generateReport(allResults, testCases);
  }

  generateReport(results, testCases) {
    console.log('\n📈 Performance Analysis Report');
    console.log('==============================');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Total tests: ${results.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Success rate: ${Math.round(successful.length / results.length * 100)}%`);

    if (successful.length > 0) {
      const durations = successful.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      
      console.log(`\n⏱️  Response Times:`);
      console.log(`   Average: ${Math.round(avgDuration)}ms`);
      console.log(`   Fastest: ${Math.min(...durations)}ms`);
      console.log(`   Slowest: ${Math.max(...durations)}ms`);
    }

    // Performance by endpoint
    console.log(`\n🎯 Performance by Endpoint:`);
    for (const testCase of testCases) {
      const endpointResults = successful.filter(r => r.endpoint === testCase.name);
      if (endpointResults.length > 0) {
        const durations = endpointResults.map(r => r.duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const classification = this.classifyPerformance(avg);
        
        console.log(`   ${testCase.name}: ${Math.round(avg)}ms ${classification}`);
      }
    }

    // Performance classification and recommendations
    console.log(`\n🔍 Analysis & Recommendations:`);
    
    const dashboardResults = successful.filter(r => r.endpoint.includes('Dashboard'));
    if (dashboardResults.length > 0) {
      const avgDashboard = dashboardResults.reduce((a, b) => a + b.duration, 0) / dashboardResults.length;
      
      if (avgDashboard > 1000) {
        console.log(`   🚨 CRITICAL: Dashboard averaging ${Math.round(avgDashboard)}ms (>1s)`);
      } else if (avgDashboard > 500) {
        console.log(`   ⚠️  WARNING: Dashboard averaging ${Math.round(avgDashboard)}ms (>500ms)`);
      } else {
        console.log(`   ✅ GOOD: Dashboard averaging ${Math.round(avgDashboard)}ms`);
      }
    }

    console.log(`\n💡 Recommended Actions:`);
    const avgOverall = successful.reduce((a, b) => a + b.duration, 0) / successful.length;
    
    if (avgOverall > 500) {
      console.log(`   1. 🔧 Database optimization needed - queries are slow`);
      console.log(`   2. 📊 Add database indexes for frequently queried fields`);
      console.log(`   3. 🗄️  Consider database connection pooling optimization`);
      console.log(`   4. 🚀 Implement caching for dashboard queries`);
      console.log(`   5. 📈 Monitor database performance metrics`);
    }

    // Compare with expected performance
    console.log(`\n🎯 Performance Expectations:`);
    console.log(`   • Dashboard should load in <200ms`);
    console.log(`   • Simple endpoints should respond in <100ms`);
    console.log(`   • Complex queries should be <300ms`);
    console.log(`   • Current average: ${Math.round(avgOverall)}ms`);
    
    const performanceRatio = Math.round(avgOverall / 200); // Assuming 200ms is target
    if (performanceRatio > 1) {
      console.log(`   🐌 Production is ${performanceRatio}x slower than target performance`);
    }
  }

  classifyPerformance(duration) {
    if (duration < 100) return '🟢 EXCELLENT';
    if (duration < 200) return '🔵 GOOD';
    if (duration < 500) return '🟡 ACCEPTABLE';
    if (duration < 1000) return '🟠 SLOW';
    return '🔴 CRITICAL';
  }
}

async function main() {
  const analyzer = new ProductionAnalyzer();
  
  try {
    await analyzer.runDashboardAnalysis();
  } catch (error) {
    console.error('❌ Error running analysis:', error.message);
  }
  
  console.log('\n🏁 Analysis complete!');
}

if (require.main === module) {
  main();
}

module.exports = ProductionAnalyzer; 
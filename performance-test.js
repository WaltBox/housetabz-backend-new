const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = process.env.TEST_USER_ID || '8'; // Based on logs
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // You'll need to provide this

// Test configuration
const ENDPOINTS_TO_TEST = [
  {
    name: 'Dashboard Data',
    method: 'GET',
    url: `/api/users/${TEST_USER_ID}`,
    critical: true
  },
  {
    name: 'Payment Methods',
    method: 'GET',
    url: '/api/payment-methods',
    critical: true
  },
  {
    name: 'User Notifications',
    method: 'GET',
    url: `/api/users/${TEST_USER_ID}/notifications`,
    critical: false
  },
  {
    name: 'Dashboard Endpoint',
    method: 'GET',
    url: '/api/dashboard',
    critical: true
  },
  {
    name: 'User Charges',
    method: 'GET',
    url: `/api/users/${TEST_USER_ID}/charges`,
    critical: true
  }
];

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  excellent: 200,
  good: 500,
  acceptable: 1000,
  slow: 2000,
  critical: 5000
};

class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.axios = axios.create({
      baseURL: BASE_URL,
      timeout: 30000, // 30 second timeout
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async testEndpoint(endpoint, iteration = 1) {
    const startTime = performance.now();
    
    try {
      const response = await this.axios({
        method: endpoint.method,
        url: endpoint.url
      });
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        status: response.status,
        duration,
        success: true,
        iteration,
        critical: endpoint.critical,
        dataSize: JSON.stringify(response.data).length,
        headers: response.headers
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        status: error.response?.status || 'TIMEOUT',
        duration,
        success: false,
        iteration,
        critical: endpoint.critical,
        error: error.message,
        errorCode: error.code
      };
    }
  }

  getPerformanceCategory(duration) {
    if (duration <= THRESHOLDS.excellent) return '🟢 EXCELLENT';
    if (duration <= THRESHOLDS.good) return '🟡 GOOD';
    if (duration <= THRESHOLDS.acceptable) return '🟠 ACCEPTABLE';
    if (duration <= THRESHOLDS.slow) return '🔴 SLOW';
    if (duration <= THRESHOLDS.critical) return '⚫ CRITICAL';
    return '💀 FAILING';
  }

  async runSingleTest() {
    console.log('\n🚀 Running Single Performance Test...\n');
    
    for (const endpoint of ENDPOINTS_TO_TEST) {
      console.log(`Testing: ${endpoint.name} (${endpoint.method} ${endpoint.url})`);
      
      const result = await this.testEndpoint(endpoint);
      this.results.push(result);
      
      const category = this.getPerformanceCategory(result.duration);
      const criticalFlag = result.critical ? '⭐ CRITICAL' : '';
      
      if (result.success) {
        console.log(`  ${category} ${result.duration}ms | Status: ${result.status} | Size: ${this.formatBytes(result.dataSize)} ${criticalFlag}`);
      } else {
        console.log(`  💥 FAILED ${result.duration}ms | Status: ${result.status} | Error: ${result.error} ${criticalFlag}`);
      }
    }
  }

  async runLoadTest(iterations = 5) {
    console.log(`\n🏋️ Running Load Test (${iterations} iterations)...\n`);
    
    for (const endpoint of ENDPOINTS_TO_TEST) {
      console.log(`\nLoad testing: ${endpoint.name}`);
      const results = [];
      
      for (let i = 1; i <= iterations; i++) {
        process.stdout.write(`  Iteration ${i}/${iterations}... `);
        const result = await this.testEndpoint(endpoint, i);
        results.push(result);
        
        const category = this.getPerformanceCategory(result.duration);
        console.log(`${category} ${result.duration}ms`);
      }
      
      // Calculate statistics
      const durations = results.filter(r => r.success).map(r => r.duration);
      const failures = results.filter(r => !r.success).length;
      
      if (durations.length > 0) {
        const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        console.log(`  📊 Stats: Avg: ${avg}ms | Min: ${min}ms | Max: ${max}ms | Failures: ${failures}/${iterations}`);
      }
      
      this.results.push(...results);
    }
  }

  async runConcurrentTest(concurrency = 3) {
    console.log(`\n⚡ Running Concurrent Test (${concurrency} parallel requests)...\n`);
    
    for (const endpoint of ENDPOINTS_TO_TEST) {
      console.log(`Concurrent testing: ${endpoint.name}`);
      
      const promises = Array(concurrency).fill().map((_, i) => 
        this.testEndpoint(endpoint, i + 1)
      );
      
      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = Math.round(performance.now() - startTime);
      
      const successCount = results.filter(r => r.success).length;
      const avgDuration = Math.round(
        results.filter(r => r.success)
          .reduce((sum, r) => sum + r.duration, 0) / successCount
      );
      
      console.log(`  📊 ${successCount}/${concurrency} successful | Avg: ${avgDuration}ms | Total time: ${totalTime}ms`);
      
      this.results.push(...results);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📈 PERFORMANCE REPORT');
    console.log('='.repeat(80));
    
    // Group results by endpoint
    const grouped = {};
    this.results.forEach(result => {
      if (!grouped[result.name]) grouped[result.name] = [];
      grouped[result.name].push(result);
    });
    
    // Critical endpoints analysis
    console.log('\n🎯 CRITICAL ENDPOINTS ANALYSIS:');
    
    Object.entries(grouped).forEach(([name, results]) => {
      const critical = results[0]?.critical;
      if (!critical) return;
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length > 0) {
        const avg = Math.round(successful.reduce((sum, r) => sum + r.duration, 0) / successful.length);
        const min = Math.min(...successful.map(r => r.duration));
        const max = Math.max(...successful.map(r => r.duration));
        
        const category = this.getPerformanceCategory(avg);
        
        console.log(`\n⭐ ${name}:`);
        console.log(`   Performance: ${category}`);
        console.log(`   Average: ${avg}ms | Min: ${min}ms | Max: ${max}ms`);
        console.log(`   Success: ${successful.length}/${results.length} requests`);
        
        if (failed.length > 0) {
          console.log(`   ❌ Failures: ${failed.length} (${failed.map(f => f.status).join(', ')})`);
        }
        
        // Performance recommendations
        if (avg > THRESHOLDS.slow) {
          console.log(`   🚨 RECOMMENDATION: This endpoint needs optimization!`);
        } else if (avg > THRESHOLDS.acceptable) {
          console.log(`   ⚠️  RECOMMENDATION: Consider optimization for better UX`);
        }
      }
    });
    
    // Overall statistics
    const allSuccessful = this.results.filter(r => r.success);
    if (allSuccessful.length > 0) {
      const overallAvg = Math.round(allSuccessful.reduce((sum, r) => sum + r.duration, 0) / allSuccessful.length);
      const slowestEndpoint = allSuccessful.reduce((prev, curr) => 
        prev.duration > curr.duration ? prev : curr
      );
      
      console.log('\n📊 OVERALL STATISTICS:');
      console.log(`   Total Requests: ${this.results.length}`);
      console.log(`   Success Rate: ${Math.round((allSuccessful.length / this.results.length) * 100)}%`);
      console.log(`   Average Response Time: ${overallAvg}ms`);
      console.log(`   Slowest Request: ${slowestEndpoint.name} (${slowestEndpoint.duration}ms)`);
    }
    
    // Recommendations
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
    
    const criticalIssues = allSuccessful.filter(r => r.critical && r.duration > THRESHOLDS.slow);
    if (criticalIssues.length > 0) {
      console.log('   🚨 HIGH PRIORITY:');
      criticalIssues.forEach(issue => {
        console.log(`   - ${issue.name}: ${issue.duration}ms (${issue.url})`);
      });
    }
    
    const slowQueries = allSuccessful.filter(r => r.duration > THRESHOLDS.acceptable);
    if (slowQueries.length > 0) {
      console.log('\n   ⚠️  MEDIUM PRIORITY:');
      console.log('   - Add database indexes for frequently queried fields');
      console.log('   - Implement caching for user data');
      console.log('   - Consider pagination for large datasets');
      console.log('   - Add query optimization to dashboard endpoints');
    }
    
    console.log('\n' + '='.repeat(80));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Main execution
async function main() {
  console.log('🎯 HouseTabz API Performance Monitor');
  console.log(`🌐 Testing: ${BASE_URL}`);
  console.log(`👤 User ID: ${TEST_USER_ID}`);
  
  if (!AUTH_TOKEN) {
    console.log('\n⚠️  Warning: No AUTH_TOKEN provided. Some endpoints may fail.');
    console.log('   Set AUTH_TOKEN environment variable for authenticated requests.');
  }
  
  const monitor = new PerformanceMonitor();
  
  try {
    // Run different types of tests
    await monitor.runSingleTest();
    await monitor.runLoadTest(3);
    await monitor.runConcurrentTest(2);
    
    // Generate comprehensive report
    monitor.generateReport();
    
  } catch (error) {
    console.error('💥 Performance test failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🎯 HouseTabz API Performance Monitor

Usage:
  node performance-test.js [options]

Environment Variables:
  BASE_URL     - API base URL (default: http://localhost:3000)
  TEST_USER_ID - User ID for testing (default: 8)
  AUTH_TOKEN   - Bearer token for authentication

Examples:
  BASE_URL=https://your-api.com AUTH_TOKEN=your_token node performance-test.js
  TEST_USER_ID=5 node performance-test.js
  `);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = PerformanceMonitor; 
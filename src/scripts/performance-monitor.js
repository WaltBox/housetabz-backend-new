const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const PRODUCTION_API = 'https://api.housetabz.com/api';
const PRODUCTION_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwiaWF0IjoxNzUyNDQ4NDgyLCJleHAiOjE3NTUwNDA0ODJ9.UTRx_v5VEdaGUG8mFrf-aYNzCYu8riS74slWmA4yNE0';

class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.testEndpoints = [
      { path: '/dashboard/user/8/summary', name: 'Dashboard Summary' },
      { path: '/dashboard/user/8', name: 'Dashboard Full' },
      { path: '/users/8/profile', name: 'User Profile' },
      { path: '/users/8/payment-methods', name: 'Payment Methods' },
      { path: '/health', name: 'Health Check' }
    ];
  }

  async testEndpoint(endpoint) {
    const url = `${PRODUCTION_API}${endpoint.path}`;
    const startTime = performance.now();
    
    try {
      const response = await axios.get(url, {
        headers: { Authorization: PRODUCTION_TOKEN },
        timeout: 30000
      });
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        name: endpoint.name,
        path: endpoint.path,
        success: true,
        duration: duration,
        status: response.status,
        dataSize: JSON.stringify(response.data).length
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        name: endpoint.name,
        path: endpoint.path,
        success: false,
        duration: duration,
        error: error.message,
        status: error.response?.status || 'timeout'
      };
    }
  }

  async runTests(iterations = 3) {
    console.log('🚀 Starting Elastic Beanstalk Performance Monitoring...');
    console.log(`📊 Testing ${this.testEndpoints.length} endpoints with ${iterations} iterations each`);
    console.log('');
    
    const results = {};
    
    for (const endpoint of this.testEndpoints) {
      console.log(`Testing ${endpoint.name}...`);
      const endpointResults = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await this.testEndpoint(endpoint);
        endpointResults.push(result);
        
        if (result.success) {
          console.log(`  ✅ Iteration ${i + 1}: ${result.duration}ms`);
        } else {
          console.log(`  ❌ Iteration ${i + 1}: ${result.error} (${result.duration}ms)`);
        }
        
        // Wait between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      results[endpoint.name] = endpointResults;
    }
    
    this.displayResults(results);
    return results;
  }

  displayResults(results) {
    console.log('\n📈 PERFORMANCE SUMMARY');
    console.log('====================');
    
    for (const [endpointName, endpointResults] of Object.entries(results)) {
      const successful = endpointResults.filter(r => r.success);
      const failed = endpointResults.filter(r => !r.success);
      
      if (successful.length > 0) {
        const times = successful.map(r => r.duration);
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        console.log(`\n${endpointName}:`);
        console.log(`  ✅ Success: ${successful.length}/${endpointResults.length}`);
        console.log(`  ⏱️  Average: ${avg}ms`);
        console.log(`  🏃‍♂️ Fastest: ${min}ms`);
        console.log(`  🐌 Slowest: ${max}ms`);
        
        if (avg > 2000) {
          console.log(`  ⚠️  WARNING: Average response time is ${avg}ms (> 2s)`);
        } else if (avg > 1000) {
          console.log(`  ⚡ GOOD: Response time is ${avg}ms (< 2s)`);
        } else {
          console.log(`  🚀 EXCELLENT: Response time is ${avg}ms (< 1s)`);
        }
      } else {
        console.log(`\n${endpointName}:`);
        console.log(`  ❌ All requests failed`);
      }
      
      if (failed.length > 0) {
        console.log(`  ❌ Failures: ${failed.length}`);
        failed.forEach(f => console.log(`    - ${f.error}`));
      }
    }
    
    console.log('\n🎯 OPTIMIZATION TARGETS:');
    for (const [endpointName, endpointResults] of Object.entries(results)) {
      const successful = endpointResults.filter(r => r.success);
      if (successful.length > 0) {
        const avg = Math.round(successful.map(r => r.duration).reduce((a, b) => a + b, 0) / successful.length);
        if (avg > 1000) {
          console.log(`  - ${endpointName}: ${avg}ms (target: < 500ms)`);
        }
      }
    }
  }

  async continuousMonitoring(intervalMinutes = 5) {
    console.log(`🔄 Starting continuous monitoring (every ${intervalMinutes} minutes)`);
    console.log('Press Ctrl+C to stop\n');
    
    const monitor = async () => {
      const timestamp = new Date().toISOString();
      console.log(`\n⏰ ${timestamp}`);
      await this.runTests(1);
    };
    
    // Run initial test
    await monitor();
    
    // Set up interval
    const interval = setInterval(monitor, intervalMinutes * 60 * 1000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping continuous monitoring...');
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// CLI Usage
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  const args = process.argv.slice(2);
  if (args.includes('--continuous')) {
    const interval = parseInt(args[args.indexOf('--continuous') + 1]) || 5;
    monitor.continuousMonitoring(interval);
  } else {
    const iterations = parseInt(args[0]) || 3;
    monitor.runTests(iterations);
  }
}

module.exports = PerformanceMonitor; 
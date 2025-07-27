const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const PRODUCTION_API = 'https://api.housetabz.com/api';
const LOCAL_API = 'http://localhost:3004/api';

class DashboardPerformanceAnalyzer {
  constructor() {
    this.results = {
      production: [],
      local: []
    };
  }

  async testEndpoint(baseUrl, endpoint, authToken = null, timeout = 30000) {
    const url = `${baseUrl}${endpoint}`;
    const startTime = performance.now();
    
    try {
      const headers = {};
      if (authToken) {
        headers.Authorization = authToken;
      }
      
      const response = await axios.get(url, { 
        headers,
        timeout,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: response.status === 200,
        status: response.status,
        duration: Math.round(duration),
        dataSize: response.data ? JSON.stringify(response.data).length : 0,
        endpoint,
        error: response.status !== 200 ? response.data : null
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: false,
        status: error.response?.status || 'timeout',
        duration: Math.round(duration),
        dataSize: 0,
        endpoint,
        error: error.message
      };
    }
  }

  async testPublicEndpoints() {
    console.log('🔍 Testing Public Endpoints (No Auth Required)');
    console.log('=================================================');
    
    const publicEndpoints = [
      '/waitlist',
      '/contact',
      '/partner-forms',
      '/deals'
    ];
    
    const results = [];
    
    for (const endpoint of publicEndpoints) {
      console.log(`\nTesting ${endpoint}...`);
      
      const result = await this.testEndpoint(PRODUCTION_API, endpoint);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.duration}ms - ${result.dataSize} bytes`);
      } else {
        console.log(`❌ ${result.duration}ms - Status: ${result.status}`);
      }
    }
    
    return results;
  }

  async testDashboardEndpoints(authToken = null) {
    console.log('\n🎯 Testing Dashboard Endpoints');
    console.log('==============================');
    
    const dashboardEndpoints = [
      '/dashboard/user/5',
      '/dashboard/user/5/summary',
      '/users/5/notifications',
      '/users/5',
      '/payment-methods'
    ];
    
    const results = [];
    
    for (const endpoint of dashboardEndpoints) {
      console.log(`\nTesting ${endpoint}...`);
      
      // Test production
      const prodResult = await this.testEndpoint(PRODUCTION_API, endpoint, authToken);
      results.push({ ...prodResult, environment: 'production' });
      
      if (prodResult.success) {
        console.log(`📊 PROD: ${prodResult.duration}ms - ${prodResult.dataSize} bytes`);
      } else {
        console.log(`❌ PROD: ${prodResult.duration}ms - Status: ${prodResult.status}`);
      }
      
      // Test local (if available)
      const localResult = await this.testEndpoint(LOCAL_API, endpoint, authToken);
      results.push({ ...localResult, environment: 'local' });
      
      if (localResult.success) {
        console.log(`🏠 LOCAL: ${localResult.duration}ms - ${localResult.dataSize} bytes`);
      } else {
        console.log(`❌ LOCAL: ${localResult.duration}ms - Status: ${localResult.status}`);
      }
      
      // Performance comparison
      if (prodResult.success && localResult.success) {
        const ratio = Math.round(prodResult.duration / localResult.duration);
        console.log(`⚡ Performance: Production is ${ratio}x slower than local`);
      }
    }
    
    return results;
  }

  async testDashboardLoad(authToken = null, iterations = 5) {
    console.log('\n🔄 Dashboard Load Test');
    console.log('======================');
    
    const endpoint = '/dashboard/user/5';
    const results = [];
    
    console.log(`Running ${iterations} iterations...`);
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.testEndpoint(PRODUCTION_API, endpoint, authToken);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Run ${i + 1}: ${result.duration}ms`);
      } else {
        console.log(`❌ Run ${i + 1}: ${result.duration}ms - Status: ${result.status}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Calculate statistics
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      const durations = successful.map(r => r.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      console.log(`\n📈 Load Test Results:`);
      console.log(`   Average: ${Math.round(avg)}ms`);
      console.log(`   Fastest: ${min}ms`);
      console.log(`   Slowest: ${max}ms`);
      console.log(`   Success rate: ${Math.round(successful.length / results.length * 100)}%`);
    }
    
    return results;
  }

  async analyzeSlowDashboard() {
    console.log('🔍 Dashboard Performance Analysis');
    console.log('=================================');
    
    // Test different components that might be slow
    const componentTests = [
      { name: 'User Data', endpoint: '/users/5' },
      { name: 'Notifications', endpoint: '/users/5/notifications' },
      { name: 'Payment Methods', endpoint: '/payment-methods' },
      { name: 'Dashboard Summary', endpoint: '/dashboard/user/5/summary' },
      { name: 'Full Dashboard', endpoint: '/dashboard/user/5' }
    ];
    
    const results = [];
    
    for (const test of componentTests) {
      console.log(`\n🧪 Testing ${test.name}...`);
      
      const result = await this.testEndpoint(PRODUCTION_API, test.endpoint);
      results.push({ ...result, name: test.name });
      
      if (result.success) {
        console.log(`✅ ${test.name}: ${result.duration}ms (${result.dataSize} bytes)`);
      } else {
        console.log(`❌ ${test.name}: ${result.duration}ms - Status: ${result.status}`);
      }
    }
    
    // Identify bottlenecks
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      const sorted = successful.sort((a, b) => b.duration - a.duration);
      
      console.log('\n🐌 Slowest Components:');
      sorted.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.name}: ${result.duration}ms`);
      });
    }
    
    return results;
  }

  generateReport(results) {
    console.log('\n📊 Performance Report');
    console.log('=====================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Total tests: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      const durations = successful.map(r => r.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      
      console.log(`\nAverage response time: ${Math.round(avg)}ms`);
      console.log(`Fastest response: ${Math.min(...durations)}ms`);
      console.log(`Slowest response: ${Math.max(...durations)}ms`);
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Common Failures:');
      const failures = {};
      failed.forEach(r => {
        const key = `${r.status} - ${r.error}`;
        failures[key] = (failures[key] || 0) + 1;
      });
      
      Object.entries(failures).forEach(([error, count]) => {
        console.log(`   ${error}: ${count} times`);
      });
    }
  }
}

async function main() {
  const analyzer = new DashboardPerformanceAnalyzer();
  const mode = process.argv[2] || 'quick';
  
  console.log('🚀 HouseTabz Dashboard Performance Analyzer');
  console.log('==========================================');
  
  try {
    switch (mode) {
      case 'quick':
        console.log('Running quick performance test...\n');
        const publicResults = await analyzer.testPublicEndpoints();
        const dashboardResults = await analyzer.testDashboardEndpoints();
        analyzer.generateReport([...publicResults, ...dashboardResults]);
        break;
        
      case 'load':
        console.log('Running load test...\n');
        await analyzer.testDashboardLoad();
        break;
        
      case 'analyze':
        console.log('Running detailed analysis...\n');
        await analyzer.analyzeSlowDashboard();
        break;
        
      case 'full':
        console.log('Running comprehensive test...\n');
        const fullResults = [];
        fullResults.push(...await analyzer.testPublicEndpoints());
        fullResults.push(...await analyzer.testDashboardEndpoints());
        fullResults.push(...await analyzer.testDashboardLoad());
        fullResults.push(...await analyzer.analyzeSlowDashboard());
        analyzer.generateReport(fullResults);
        break;
        
      default:
        console.log('Usage: node dashboard_performance_analyzer.js [mode]');
        console.log('Modes:');
        console.log('  quick   - Quick test of key endpoints');
        console.log('  load    - Load test dashboard endpoint');
        console.log('  analyze - Detailed component analysis');
        console.log('  full    - Complete performance analysis');
    }
  } catch (error) {
    console.error('❌ Error running analysis:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = DashboardPerformanceAnalyzer; 
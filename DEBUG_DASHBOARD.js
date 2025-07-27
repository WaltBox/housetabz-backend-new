// DEBUG_DASHBOARD.js
// Run this in your browser console or as a separate script to debug dashboard issues

const debugDashboard = async (userId) => {
  console.log('🔍 Starting Dashboard Debug...');
  console.log('=====================================');
  
  // Step 1: Check if we're on the right branch
  console.log('1. Checking server branch...');
  try {
    const branchResponse = await fetch('/api/health', {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (branchResponse.ok) {
      console.log('✅ Server is responding');
    } else {
      console.log('❌ Server health check failed:', branchResponse.status);
      return;
    }
  } catch (error) {
    console.log('❌ Cannot connect to server:', error.message);
    return;
  }
  
  // Step 2: Test dashboard endpoint existence
  console.log('\n2. Testing dashboard endpoint...');
  try {
    const testResponse = await fetch(`/api/dashboard/user/${userId}`, {
      method: 'HEAD' // Just check if endpoint exists
    });
    
    if (testResponse.status === 404) {
      console.log('❌ Dashboard endpoint not found!');
      console.log('🔧 Are you on the feature/fix-shit branch?');
      console.log('🔧 Check: git branch');
      console.log('🔧 Switch: git checkout feature/fix-shit');
      return;
    } else if (testResponse.status === 401) {
      console.log('❌ Authentication required');
      console.log('🔧 Make sure to include Authorization header');
      return;
    } else {
      console.log('✅ Dashboard endpoint exists');
    }
  } catch (error) {
    console.log('❌ Dashboard endpoint test failed:', error.message);
    return;
  }
  
  // Step 3: Test actual dashboard call
  console.log('\n3. Testing dashboard data fetch...');
  try {
    const response = await fetch(`/api/dashboard/user/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        // Add auth header if you have it
        // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Request failed:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Dashboard data received');
    
    // Step 4: Analyze response structure
    console.log('\n4. Analyzing response structure...');
    console.log('Response success:', data.success);
    console.log('Has data?', !!data.data);
    
    if (!data.data) {
      console.log('❌ No data in response');
      return;
    }
    
    const { data: dashboardData } = data;
    
    // Check each component
    console.log('\n5. Checking dashboard components...');
    
    console.log('📊 User data:', !!dashboardData.user);
    if (dashboardData.user) {
      console.log('  - User ID:', dashboardData.user.id);
      console.log('  - Has finance?', !!dashboardData.user.finance);
      console.log('  - Balance:', dashboardData.user.finance?.balance);
    }
    
    console.log('🏠 House data:', !!dashboardData.house);
    if (dashboardData.house) {
      console.log('  - House ID:', dashboardData.house.id);
      console.log('  - House name:', dashboardData.house.name);
      console.log('  - Has HSI?', !!dashboardData.house.hsi);
    }
    
    console.log('💳 Pending charges:', Array.isArray(dashboardData.pendingCharges) ? dashboardData.pendingCharges.length : 'NOT ARRAY');
    console.log('📋 Tasks:', Array.isArray(dashboardData.pendingTasks) ? dashboardData.pendingTasks.length : 'NOT ARRAY');
    
    // CRITICAL: Check urgent messages and bill submissions
    console.log('\n🚨 URGENT MESSAGES:');
    console.log('  - Is array?', Array.isArray(dashboardData.urgentMessages));
    console.log('  - Count:', dashboardData.urgentMessages?.length || 0);
    if (dashboardData.urgentMessages?.length > 0) {
      console.log('  - First message:', dashboardData.urgentMessages[0]);
    }
    
    console.log('📋 BILL SUBMISSIONS:');
    console.log('  - Is array?', Array.isArray(dashboardData.billSubmissions));
    console.log('  - Count:', dashboardData.billSubmissions?.length || 0);
    if (dashboardData.billSubmissions?.length > 0) {
      console.log('  - First submission:', dashboardData.billSubmissions[0]);
    }
    
    console.log('📈 Summary:', !!dashboardData.summary);
    if (dashboardData.summary) {
      console.log('  - Urgent messages count:', dashboardData.summary.urgentMessagesCount);
      console.log('  - Bill submissions count:', dashboardData.summary.billSubmissionsCount);
      console.log('  - Pending charges count:', dashboardData.summary.pendingTasksCount);
    }
    
    // Step 6: Test data in database
    console.log('\n6. Database checks needed:');
    console.log('🔧 Run these queries in your database to check if data exists:');
    console.log(`   SELECT * FROM UrgentMessages WHERE userId = ${userId} AND resolved = false;`);
    console.log(`   SELECT * FROM BillSubmissions WHERE submittedBy = ${userId} OR houseId = (SELECT houseId FROM Users WHERE id = ${userId});`);
    console.log(`   SELECT * FROM Charges WHERE userId = ${userId} AND status = 'unpaid';`);
    
    // Step 7: Full response for debugging
    console.log('\n7. FULL RESPONSE FOR DEBUGGING:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.log('❌ Dashboard fetch failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
};

// Usage examples:
console.log('To debug dashboard issues, run:');
console.log('debugDashboard(1); // Replace 1 with actual user ID');

// Auto-run if userId is provided
if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  if (userId) {
    debugDashboard(userId);
  }
} 
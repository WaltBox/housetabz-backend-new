const { sequelize } = require('./src/models');

async function emergencyDatabaseFix() {
  console.log('🚨 EMERGENCY DATABASE CONNECTION FIX');
  console.log('====================================');
  
  try {
    // Force close all existing connections
    console.log('1. Closing all existing database connections...');
    await sequelize.connectionManager.close();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test new connection
    console.log('2. Testing new database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check connection pool status
    const pool = sequelize.connectionManager.pool;
    console.log('3. Connection Pool Status:');
    console.log(`   - Size: ${pool.size}`);
    console.log(`   - Available: ${pool.available}`);
    console.log(`   - Using: ${pool.using}`);
    console.log(`   - Waiting: ${pool.waiting}`);
    
    // Run a simple query to verify
    console.log('4. Testing simple query...');
    const result = await sequelize.query('SELECT 1 as test', { type: sequelize.QueryTypes.SELECT });
    console.log('✅ Query successful:', result);
    
    console.log('5. ✅ Emergency fix completed successfully!');
    console.log('   Your database connections should now be working.');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.log('\n🔧 MANUAL STEPS NEEDED:');
    console.log('1. Restart your Elastic Beanstalk environment');
    console.log('2. Check your database server for blocking queries');
    console.log('3. Monitor connection pool usage');
  } finally {
    // Always close the connection
    await sequelize.close();
  }
}

// Run immediately
emergencyDatabaseFix();
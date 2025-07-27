'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚨 EMERGENCY: Cleaning up duplicate indexes on Users table...');
    
    // Get all indexes on Users table
    const indexes = await queryInterface.sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'Users' 
      AND indexname != 'Users_pkey'
      ORDER BY indexname;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`Found ${indexes.length} indexes to clean up`);
    
    // Keep only the first of each type, drop the rest
    const keepIndexes = new Set([
      'Users_pkey', // Primary key - never drop
      'Users_auth0Id_key', // Keep first auth0Id index
      'Users_email_key', // Keep first email index  
      'Users_username_key' // Keep first username index
    ]);
    
    let dropped = 0;
    for (const index of indexes) {
      if (!keepIndexes.has(index.indexname)) {
        try {
          await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${index.indexname}";`);
          dropped++;
          if (dropped % 50 === 0) {
            console.log(`Dropped ${dropped} duplicate indexes...`);
          }
        } catch (error) {
          console.log(`Could not drop ${index.indexname}: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Dropped ${dropped} duplicate indexes`);
    
    // Verify cleanup
    const remainingIndexes = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE tablename = 'Users';
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`✅ Users table now has ${remainingIndexes[0].count} indexes (should be ~4)`);
    
    // Add any missing essential indexes
    try {
      await queryInterface.addIndex('Users', {
        fields: ['houseId'],
        name: 'idx_users_house_id'
      });
      console.log('✅ Added houseId index');
    } catch (error) {
      console.log('houseId index may already exist');
    }
    
    console.log('🎉 Database cleanup completed!');
  },

  down: async (queryInterface, Sequelize) => {
    // This is intentionally left minimal - we don't want to recreate 931 duplicate indexes
    console.log('⚠️  Rollback: This cleanup cannot be fully reversed');
    console.log('The duplicate indexes were causing major performance issues');
    console.log('Manual restoration would require rebuilding from backup if needed');
  }
}; 
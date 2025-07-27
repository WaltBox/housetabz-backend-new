'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Adding production-safe performance indexes...');
    
    // Helper function to safely add indexes
    const safeAddIndex = async (tableName, fields, options) => {
      try {
        await queryInterface.addIndex(tableName, fields, options);
        console.log(`✅ Added index ${options.name || 'unnamed'} to ${tableName}`);
      } catch (error) {
        console.log(`⚠️  Skipped index ${options.name || 'unnamed'} to ${tableName}: ${error.message}`);
      }
    };
    
    // CRITICAL: Bills table indexes (confirmed columns exist)
    await safeAddIndex('Bills', ['houseId', 'status'], { name: 'idx_bills_house_status' });
    await safeAddIndex('Bills', ['status', 'dueDate'], { name: 'idx_bills_status_due' });
    await safeAddIndex('Bills', ['houseId', 'createdAt'], { name: 'idx_bills_house_created' });
    
    // CRITICAL: Charges table indexes (confirmed columns exist)
    await safeAddIndex('Charges', ['userId', 'status'], { name: 'idx_charges_user_status' });
    await safeAddIndex('Charges', ['billId', 'status'], { name: 'idx_charges_bill_status' });
    await safeAddIndex('Charges', ['status', 'dueDate'], { name: 'idx_charges_status_due' });
    await safeAddIndex('Charges', ['userId', 'advanced', 'status'], { name: 'idx_charges_user_advanced_status' });
    
    // CRITICAL: Notifications table indexes (confirmed columns exist)
    await safeAddIndex('Notifications', ['userId', 'isRead'], { name: 'idx_notifications_user_read' });
    await safeAddIndex('Notifications', ['userId', 'createdAt'], { name: 'idx_notifications_user_created' });
    
    // CRITICAL: UrgentMessages table indexes (using snake_case column names)
    await safeAddIndex('UrgentMessages', ['user_id', 'is_resolved'], { name: 'idx_urgent_user_resolved' });
    await safeAddIndex('UrgentMessages', ['house_id', 'is_resolved'], { name: 'idx_urgent_house_resolved' });
    await safeAddIndex('UrgentMessages', ['charge_id'], { name: 'idx_urgent_charge' });
    
    // Additional safe indexes for tables we know exist
    await safeAddIndex('Users', ['houseId'], { name: 'idx_users_house' });
    await safeAddIndex('Houses', ['createdAt'], { name: 'idx_houses_created' });
    
    // Financial tables (if they exist)
    await safeAddIndex('UserFinances', ['userId'], { name: 'idx_userfinances_user' });
    await safeAddIndex('HouseFinances', ['houseId'], { name: 'idx_housefinances_house' });
    await safeAddIndex('HouseStatusIndexes', ['houseId'], { name: 'idx_hsi_house' });
    
    // Service-related tables
    await safeAddIndex('HouseServices', ['houseId', 'status'], { name: 'idx_houseservices_house_status' });
    await safeAddIndex('ServiceRequestBundles', ['houseId', 'status'], { name: 'idx_bundles_house_status' });
    await safeAddIndex('Tasks', ['userId', 'status'], { name: 'idx_tasks_user_status' });
    
    console.log('✅ Production-safe performance indexes completed');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️  Removing production-safe performance indexes...');
    
    const indexesToDrop = [
      'idx_bills_house_status', 'idx_bills_status_due', 'idx_bills_house_created',
      'idx_charges_user_status', 'idx_charges_bill_status', 'idx_charges_status_due', 'idx_charges_user_advanced_status',
      'idx_notifications_user_read', 'idx_notifications_user_created',
      'idx_urgent_user_resolved', 'idx_urgent_house_resolved', 'idx_urgent_charge',
      'idx_users_house', 'idx_houses_created',
      'idx_userfinances_user', 'idx_housefinances_house', 'idx_hsi_house',
      'idx_houseservices_house_status', 'idx_bundles_house_status', 'idx_tasks_user_status'
    ];
    
    for (const indexName of indexesToDrop) {
      try {
        await queryInterface.removeIndex(null, indexName);
        console.log(`✅ Removed index ${indexName}`);
      } catch (error) {
        console.log(`⚠️  Index ${indexName} may not exist: ${error.message}`);
      }
    }
    
    console.log('✅ Production-safe performance indexes removal completed');
  }
}; 
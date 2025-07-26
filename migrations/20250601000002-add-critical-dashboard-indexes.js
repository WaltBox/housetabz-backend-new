'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Adding critical dashboard performance indexes...');
    
    try {
      // 1. CHARGES table indexes (most critical for dashboard)
      await queryInterface.addIndex('Charges', ['userId'], {
        name: 'idx_charges_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('Charges', ['status'], {
        name: 'idx_charges_status',
        concurrently: true
      });
      
      await queryInterface.addIndex('Charges', ['userId', 'status'], {
        name: 'idx_charges_user_status',
        concurrently: true
      });
      
      await queryInterface.addIndex('Charges', ['dueDate'], {
        name: 'idx_charges_due_date',
        concurrently: true
      });
      
      await queryInterface.addIndex('Charges', ['billId'], {
        name: 'idx_charges_bill_id',
        concurrently: true
      });

      // 2. BILLS table indexes
      await queryInterface.addIndex('Bills', ['houseId'], {
        name: 'idx_bills_house_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('Bills', ['status'], {
        name: 'idx_bills_status',
        concurrently: true
      });
      
      await queryInterface.addIndex('Bills', ['houseId', 'status'], {
        name: 'idx_bills_house_status',
        concurrently: true
      });
      
      await queryInterface.addIndex('Bills', ['createdAt'], {
        name: 'idx_bills_created_at',
        concurrently: true
      });
      
      await queryInterface.addIndex('Bills', ['dueDate'], {
        name: 'idx_bills_due_date',
        concurrently: true
      });

      // 3. TASKS table indexes
      await queryInterface.addIndex('Tasks', ['userId'], {
        name: 'idx_tasks_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('Tasks', ['status'], {
        name: 'idx_tasks_status',
        concurrently: true
      });
      
      await queryInterface.addIndex('Tasks', ['userId', 'status'], {
        name: 'idx_tasks_user_status',
        concurrently: true
      });

      // 4. TRANSACTIONS table indexes
      await queryInterface.addIndex('Transactions', ['userId'], {
        name: 'idx_transactions_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('Transactions', ['houseId'], {
        name: 'idx_transactions_house_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('Transactions', ['createdAt'], {
        name: 'idx_transactions_created_at',
        concurrently: true
      });
      
      await queryInterface.addIndex('Transactions', ['userId', 'createdAt'], {
        name: 'idx_transactions_user_created',
        concurrently: true
      });

      // 5. NOTIFICATIONS table indexes
      await queryInterface.addIndex('Notifications', ['userId'], {
        name: 'idx_notifications_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('Notifications', ['isRead'], {
        name: 'idx_notifications_is_read',
        concurrently: true
      });
      
      await queryInterface.addIndex('Notifications', ['userId', 'isRead'], {
        name: 'idx_notifications_user_read',
        concurrently: true
      });
      
      await queryInterface.addIndex('Notifications', ['createdAt'], {
        name: 'idx_notifications_created_at',
        concurrently: true
      });

      // 6. URGENT MESSAGES table indexes
      await queryInterface.addIndex('UrgentMessages', ['user_id'], {
        name: 'idx_urgent_messages_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('UrgentMessages', ['is_resolved'], {
        name: 'idx_urgent_messages_resolved',
        concurrently: true
      });
      
      await queryInterface.addIndex('UrgentMessages', ['user_id', 'is_resolved'], {
        name: 'idx_urgent_messages_user_resolved',
        concurrently: true
      });
      
      await queryInterface.addIndex('UrgentMessages', ['created_at'], {
        name: 'idx_urgent_messages_created_at',
        concurrently: true
      });

      // 7. BILL SUBMISSIONS table indexes
      await queryInterface.addIndex('BillSubmissions', ['userId'], {
        name: 'idx_bill_submissions_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('BillSubmissions', ['houseServiceId'], {
        name: 'idx_bill_submissions_house_service_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('BillSubmissions', ['status'], {
        name: 'idx_bill_submissions_status',
        concurrently: true
      });
      
      await queryInterface.addIndex('BillSubmissions', ['createdAt'], {
        name: 'idx_bill_submissions_created_at',
        concurrently: true
      });

      // 8. HOUSE SERVICES table indexes (for the slow house services query)
      await queryInterface.addIndex('HouseServices', ['houseId'], {
        name: 'idx_house_services_house_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('HouseServices', ['designatedUserId'], {
        name: 'idx_house_services_designated_user',
        concurrently: true
      });
      
      await queryInterface.addIndex('HouseServices', ['serviceRequestBundleId'], {
        name: 'idx_house_services_bundle_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('HouseServices', ['status'], {
        name: 'idx_house_services_status',
        concurrently: true
      });

      // 9. SERVICE REQUEST BUNDLES table indexes
      await queryInterface.addIndex('ServiceRequestBundles', ['houseId'], {
        name: 'idx_service_bundles_house_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('ServiceRequestBundles', ['userId'], {
        name: 'idx_service_bundles_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('ServiceRequestBundles', ['stagedRequestId'], {
        name: 'idx_service_bundles_staged_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('ServiceRequestBundles', ['takeOverRequestId'], {
        name: 'idx_service_bundles_takeover_id',
        concurrently: true
      });

      // 10. USER FINANCE and HOUSE FINANCE indexes
      await queryInterface.addIndex('UserFinances', ['userId'], {
        name: 'idx_user_finances_user_id',
        concurrently: true
      });
      
      await queryInterface.addIndex('HouseFinances', ['houseId'], {
        name: 'idx_house_finances_house_id',
        concurrently: true
      });

      // 11. HOUSE STATUS INDEX
      await queryInterface.addIndex('HouseStatusIndexes', ['houseId'], {
        name: 'idx_house_status_house_id',
        concurrently: true
      });

      console.log('✅ All critical dashboard indexes added successfully!');
      
    } catch (error) {
      console.error('❌ Error adding dashboard indexes:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️ Removing dashboard performance indexes...');
    
    try {
      // Drop indexes in reverse order
      const indexesToDrop = [
        // Charges table
        { table: 'Charges', index: 'idx_charges_user_id' },
        { table: 'Charges', index: 'idx_charges_status' },
        { table: 'Charges', index: 'idx_charges_user_status' },
        { table: 'Charges', index: 'idx_charges_due_date' },
        { table: 'Charges', index: 'idx_charges_bill_id' },
        // Bills table
        { table: 'Bills', index: 'idx_bills_house_id' },
        { table: 'Bills', index: 'idx_bills_status' },
        { table: 'Bills', index: 'idx_bills_house_status' },
        { table: 'Bills', index: 'idx_bills_created_at' },
        { table: 'Bills', index: 'idx_bills_due_date' },
        // Tasks table
        { table: 'Tasks', index: 'idx_tasks_user_id' },
        { table: 'Tasks', index: 'idx_tasks_status' },
        { table: 'Tasks', index: 'idx_tasks_user_status' },
        // Transactions table
        { table: 'Transactions', index: 'idx_transactions_user_id' },
        { table: 'Transactions', index: 'idx_transactions_house_id' },
        { table: 'Transactions', index: 'idx_transactions_created_at' },
        { table: 'Transactions', index: 'idx_transactions_user_created' },
        // Notifications table
        { table: 'Notifications', index: 'idx_notifications_user_id' },
        { table: 'Notifications', index: 'idx_notifications_is_read' },
        { table: 'Notifications', index: 'idx_notifications_user_read' },
        { table: 'Notifications', index: 'idx_notifications_created_at' },
        // UrgentMessages table
        { table: 'UrgentMessages', index: 'idx_urgent_messages_user_id' },
        { table: 'UrgentMessages', index: 'idx_urgent_messages_resolved' },
        { table: 'UrgentMessages', index: 'idx_urgent_messages_user_resolved' },
        { table: 'UrgentMessages', index: 'idx_urgent_messages_created_at' },
        // BillSubmissions table
        { table: 'BillSubmissions', index: 'idx_bill_submissions_user_id' },
        { table: 'BillSubmissions', index: 'idx_bill_submissions_house_service_id' },
        { table: 'BillSubmissions', index: 'idx_bill_submissions_status' },
        { table: 'BillSubmissions', index: 'idx_bill_submissions_created_at' },
        // HouseServices table
        { table: 'HouseServices', index: 'idx_house_services_house_id' },
        { table: 'HouseServices', index: 'idx_house_services_designated_user' },
        { table: 'HouseServices', index: 'idx_house_services_bundle_id' },
        { table: 'HouseServices', index: 'idx_house_services_status' },
        // ServiceRequestBundles table
        { table: 'ServiceRequestBundles', index: 'idx_service_bundles_house_id' },
        { table: 'ServiceRequestBundles', index: 'idx_service_bundles_user_id' },
        { table: 'ServiceRequestBundles', index: 'idx_service_bundles_staged_id' },
        { table: 'ServiceRequestBundles', index: 'idx_service_bundles_takeover_id' },
        // Finance tables
        { table: 'UserFinances', index: 'idx_user_finances_user_id' },
        { table: 'HouseFinances', index: 'idx_house_finances_house_id' },
        { table: 'HouseStatusIndexes', index: 'idx_house_status_house_id' }
      ];

      for (const { table, index } of indexesToDrop) {
        try {
          await queryInterface.removeIndex(table, index);
          console.log(`✅ Dropped ${index} from ${table}`);
        } catch (error) {
          console.log(`⚠️ Index ${index} not found on ${table}, skipping...`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error removing indexes:', error);
      throw error;
    }
    
    console.log('✅ Dashboard indexes removed');
  }
}; 
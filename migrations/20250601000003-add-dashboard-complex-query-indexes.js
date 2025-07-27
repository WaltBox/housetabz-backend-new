'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Additional indexes for complex dashboard queries that are still slow
    // Made idempotent to handle partial failures
    
    const createIndexIfNotExists = async (tableName, options) => {
      try {
        await queryInterface.addIndex(tableName, options);
        console.log(`✅ Created index: ${options.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Index already exists: ${options.name}`);
        } else {
          console.error(`❌ Error creating index ${options.name}:`, error.message);
          throw error;
        }
      }
    };
    
    // 1. BillSubmissions - complex OR query optimization
    await createIndexIfNotExists('BillSubmissions', {
      fields: ['status', 'userId'],
      name: 'idx_billsubmissions_status_user'
    });
    
    await createIndexIfNotExists('BillSubmissions', {
      fields: ['status', 'createdAt'],
      name: 'idx_billsubmissions_status_created'
    });
    
    // 2. UrgentMessages - dashboard query optimization 
    await createIndexIfNotExists('UrgentMessages', {
      fields: ['user_id', 'is_resolved', 'created_at'],
      name: 'idx_urgentmessages_user_resolved_created'
    });
    
    // 3. Tasks - complex includes with ServiceRequestBundle
    await createIndexIfNotExists('Tasks', {
      fields: ['userId', 'status', 'createdAt'],
      name: 'idx_tasks_user_status_created'
    });
    
    await createIndexIfNotExists('Tasks', {
      fields: ['paymentRequired', 'paymentStatus'],
      name: 'idx_tasks_payment_required_status'
    });
    
    // 4. ServiceRequestBundles - for task includes
    await createIndexIfNotExists('ServiceRequestBundles', {
      fields: ['status', 'type'],
      name: 'idx_servicerequestbundles_status_type'
    });
    
    // 5. Bills - recent bills query with HouseService join
    await createIndexIfNotExists('Bills', {
      fields: ['houseId', 'createdAt', 'status'],
      name: 'idx_bills_house_created_status'
    });
    
    await createIndexIfNotExists('Bills', {
      fields: ['houseId', 'dueDate', 'status'],
      name: 'idx_bills_house_due_status'
    });
    
    // 6. Transactions - recent transactions optimization
    await createIndexIfNotExists('Transactions', {
      fields: ['houseId', 'createdAt'],
      name: 'idx_transactions_house_created'
    });
    
    await createIndexIfNotExists('Transactions', {
      fields: ['userId', 'createdAt', 'status'],
      name: 'idx_transactions_user_created_status'
    });
    
    // 7. HouseServices - frequently joined table
    await createIndexIfNotExists('HouseServices', {
      fields: ['houseId', 'type', 'status'],
      name: 'idx_houseservices_house_type_status'
    });
    
    // 8. Optimize charge queries with bill joins
    await createIndexIfNotExists('Charges', {
      fields: ['userId', 'status', 'dueDate'],
      name: 'idx_charges_user_status_due'
    });
    
    await createIndexIfNotExists('Charges', {
      fields: ['userId', 'advanced'],
      name: 'idx_charges_user_advanced'
    });
    
    console.log('✅ Dashboard complex query indexes migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the indexes in reverse order
    const indexes = [
      'idx_charges_user_advanced',
      'idx_charges_user_status_due',
      'idx_houseservices_house_type_status',
      'idx_transactions_user_created_status',
      'idx_transactions_house_created',
      'idx_bills_house_due_status',
      'idx_bills_house_created_status',
      'idx_servicerequestbundles_status_type',
      'idx_tasks_payment_required_status',
      'idx_tasks_user_status_created',
      'idx_urgentmessages_user_resolved_created',
      'idx_billsubmissions_status_created',
      'idx_billsubmissions_status_user'
    ];
    
    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('BillSubmissions', indexName);
      } catch (error) {
        // Try other tables if not found in BillSubmissions
        const tables = ['UrgentMessages', 'Tasks', 'ServiceRequestBundles', 'Bills', 'Transactions', 'HouseServices', 'Charges'];
        for (const table of tables) {
          try {
            await queryInterface.removeIndex(table, indexName);
            break;
          } catch (e) {
            // Continue to next table
          }
        }
      }
    }
    
    console.log('✅ Dashboard complex query indexes removed');
  }
}; 
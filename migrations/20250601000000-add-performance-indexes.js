'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding comprehensive performance indexes for feature/fix-shit branch...');
    
    // Bills - Core financial operations
    await queryInterface.addIndex('Bills', ['houseId', 'status'], { name: 'idx_bills_house_status' });
    await queryInterface.addIndex('Bills', ['houseId', 'createdAt'], { name: 'idx_bills_house_created' });
    await queryInterface.addIndex('Bills', ['status', 'dueDate'], { name: 'idx_bills_status_due' });
    await queryInterface.addIndex('Bills', ['houseService_id', 'status'], { name: 'idx_bills_service_status' });
    await queryInterface.addIndex('Bills', ['providerPaid', 'status'], { name: 'idx_bills_provider_status' });
    
    // Charges - High-frequency queries
    await queryInterface.addIndex('Charges', ['userId', 'status'], { name: 'idx_charges_user_status' });
    await queryInterface.addIndex('Charges', ['billId', 'status'], { name: 'idx_charges_bill_status' });
    await queryInterface.addIndex('Charges', ['status', 'dueDate'], { name: 'idx_charges_status_due' });
    await queryInterface.addIndex('Charges', ['advanced', 'status'], { name: 'idx_charges_advanced_status' });
    await queryInterface.addIndex('Charges', ['userId', 'advanced', 'status'], { name: 'idx_charges_user_advanced_status' });
    await queryInterface.addIndex('Charges', ['dueDate', 'status'], { name: 'idx_charges_due_status' });
    
    // House Services - Service management queries
    await queryInterface.addIndex('HouseServices', ['houseId', 'status'], { name: 'idx_houseservices_house_status' });
    await queryInterface.addIndex('HouseServices', ['houseId', 'type'], { name: 'idx_houseservices_house_type' });
    await queryInterface.addIndex('HouseServices', ['designatedUserId', 'status'], { name: 'idx_houseservices_designated_status' });
    await queryInterface.addIndex('HouseServices', ['serviceRequestBundleId'], { name: 'idx_houseservices_bundle' });
    
    // House Service Ledgers - Complex funding calculations
    await queryInterface.addIndex('HouseServiceLedgers', ['houseServiceId', 'status'], { name: 'idx_ledgers_service_status' });
    await queryInterface.addIndex('HouseServiceLedgers', ['status', 'cycleEnd'], { name: 'idx_ledgers_status_cycle' });
    await queryInterface.addIndex('HouseServiceLedgers', ['billId'], { name: 'idx_ledgers_bill' });
    
    // User Finance - Financial tracking
    await queryInterface.addIndex('UserFinances', ['userId'], { name: 'idx_userfinances_user', unique: true });
    await queryInterface.addIndex('UserFinances', ['balance'], { name: 'idx_userfinances_balance' });
    await queryInterface.addIndex('UserFinances', ['points'], { name: 'idx_userfinances_points' });
    
    // House Finance - House-level financial tracking
    await queryInterface.addIndex('HouseFinances', ['houseId'], { name: 'idx_housefinances_house', unique: true });
    await queryInterface.addIndex('HouseFinances', ['balance'], { name: 'idx_housefinances_balance' });
    
    // House Status Index - HSI calculations and risk assessment
    await queryInterface.addIndex('HouseStatusIndexes', ['houseId'], { name: 'idx_hsi_house', unique: true });
    await queryInterface.addIndex('HouseStatusIndexes', ['score'], { name: 'idx_hsi_score' });
    await queryInterface.addIndex('HouseStatusIndexes', ['bracket'], { name: 'idx_hsi_bracket' });
    await queryInterface.addIndex('HouseStatusIndexes', ['lastRiskAssessment'], { name: 'idx_hsi_last_risk' });
    
    // Transactions - Financial transaction history
    await queryInterface.addIndex('Transactions', ['userId', 'createdAt'], { name: 'idx_transactions_user_created' });
    await queryInterface.addIndex('Transactions', ['houseId', 'createdAt'], { name: 'idx_transactions_house_created' });
    await queryInterface.addIndex('Transactions', ['type', 'createdAt'], { name: 'idx_transactions_type_created' });
    await queryInterface.addIndex('Transactions', ['userId', 'type', 'status'], { name: 'idx_transactions_user_type_status' });
    await queryInterface.addIndex('Transactions', ['chargeId'], { name: 'idx_transactions_charge' });
    await queryInterface.addIndex('Transactions', ['billId'], { name: 'idx_transactions_bill' });
    
    // Notifications - User messaging
    await queryInterface.addIndex('Notifications', ['userId', 'isRead'], { name: 'idx_notifications_user_read' });
    await queryInterface.addIndex('Notifications', ['userId', 'createdAt'], { name: 'idx_notifications_user_created' });
    
    // Service Request Bundles - Service request management
    await queryInterface.addIndex('ServiceRequestBundles', ['houseId', 'status'], { name: 'idx_bundles_house_status' });
    await queryInterface.addIndex('ServiceRequestBundles', ['userId', 'status'], { name: 'idx_bundles_user_status' });
    await queryInterface.addIndex('ServiceRequestBundles', ['type', 'status'], { name: 'idx_bundles_type_status' });
    
    // Tasks - Task management system
    await queryInterface.addIndex('Tasks', ['userId', 'status'], { name: 'idx_tasks_user_status' });
    await queryInterface.addIndex('Tasks', ['serviceRequestBundleId', 'status'], { name: 'idx_tasks_bundle_status' });
    await queryInterface.addIndex('Tasks', ['paymentStatus'], { name: 'idx_tasks_payment_status' });
    
    // Urgent Messages - Urgent notification system
    await queryInterface.addIndex('UrgentMessages', ['userId', 'resolved'], { name: 'idx_urgent_user_resolved' });
    await queryInterface.addIndex('UrgentMessages', ['houseId', 'resolved'], { name: 'idx_urgent_house_resolved' });
    await queryInterface.addIndex('UrgentMessages', ['chargeId'], { name: 'idx_urgent_charge' });
    
    // Staged Requests - Partner integration
    await queryInterface.addIndex('StagedRequests', ['partnerId', 'status'], { name: 'idx_staged_partner_status' });
    await queryInterface.addIndex('StagedRequests', ['transactionId'], { name: 'idx_staged_transaction' });
    
    console.log('✅ All performance indexes created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing performance indexes...');
    
    const indexesToDrop = [
      'idx_bills_house_status', 'idx_bills_house_created', 'idx_bills_status_due', 
      'idx_bills_service_status', 'idx_bills_provider_status',
      'idx_charges_user_status', 'idx_charges_bill_status', 'idx_charges_status_due',
      'idx_charges_advanced_status', 'idx_charges_user_advanced_status', 'idx_charges_due_status',
      'idx_houseservices_house_status', 'idx_houseservices_house_type', 'idx_houseservices_designated_status',
      'idx_houseservices_bundle', 'idx_ledgers_service_status', 'idx_ledgers_status_cycle', 'idx_ledgers_bill',
      'idx_userfinances_user', 'idx_userfinances_balance', 'idx_userfinances_points',
      'idx_housefinances_house', 'idx_housefinances_balance',
      'idx_hsi_house', 'idx_hsi_score', 'idx_hsi_bracket', 'idx_hsi_last_risk',
      'idx_transactions_user_created', 'idx_transactions_house_created', 'idx_transactions_type_created',
      'idx_transactions_user_type_status', 'idx_transactions_charge', 'idx_transactions_bill',
      'idx_notifications_user_read', 'idx_notifications_user_created',
      'idx_bundles_house_status', 'idx_bundles_user_status', 'idx_bundles_type_status',
      'idx_tasks_user_status', 'idx_tasks_bundle_status', 'idx_tasks_payment_status',
      'idx_urgent_user_resolved', 'idx_urgent_house_resolved', 'idx_urgent_charge',
      'idx_staged_partner_status', 'idx_staged_transaction'
    ];
    
    for (const indexName of indexesToDrop) {
      try {
        await queryInterface.removeIndex(null, indexName);
      } catch (error) {
        console.log(`Index ${indexName} may not exist or already dropped`);
      }
    }
    
    console.log('✅ All performance indexes removed');
  }
}; 
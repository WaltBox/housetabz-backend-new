'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add indexes for dashboard summary performance optimization
    
    // 1. Charges table - critical for summary calculations
    await queryInterface.addIndex('Charges', ['userId', 'status'], {
      name: 'idx_charges_user_status_dashboard',
      where: { status: 'unpaid' }
    });
    
    await queryInterface.addIndex('Charges', ['userId', 'dueDate'], {
      name: 'idx_charges_user_due_date_dashboard'
    });
    
    await queryInterface.addIndex('Charges', ['userId', 'status', 'dueDate'], {
      name: 'idx_charges_user_status_due_dashboard'
    });

    // 2. Tasks table - for pending tasks count
    await queryInterface.addIndex('Tasks', ['userId', 'status'], {
      name: 'idx_tasks_user_status_dashboard',
      where: { status: false }
    });

    // 3. Notifications table - for unread count
    await queryInterface.addIndex('Notifications', ['userId', 'isRead'], {
      name: 'idx_notifications_user_read_dashboard',
      where: { isRead: false }
    });

    // 4. UrgentMessages table - for urgent messages count
    await queryInterface.addIndex('UrgentMessages', ['user_id', 'is_resolved'], {
      name: 'idx_urgent_messages_user_resolved_dashboard',
      where: { is_resolved: false }
    });

    // 5. Bills table - for recent bills count
    await queryInterface.addIndex('Bills', ['houseId', 'createdAt'], {
      name: 'idx_bills_house_created_dashboard'
    });

    // 6. BillSubmissions table - for submissions count
    await queryInterface.addIndex('BillSubmissions', ['userId', 'status'], {
      name: 'idx_bill_submissions_user_status_dashboard'
    });

    // 7. HouseServices table - for house services count
    await queryInterface.addIndex('HouseServices', ['houseId'], {
      name: 'idx_house_services_house_dashboard'
    });

    // 8. UserFinances table - for user balance/points
    await queryInterface.addIndex('UserFinances', ['userId'], {
      name: 'idx_user_finances_user_dashboard'
    });

    // 9. HouseStatusIndexes table - for HSI score
    await queryInterface.addIndex('HouseStatusIndexes', ['houseId'], {
      name: 'idx_house_status_indexes_house_dashboard'
    });

    console.log('✅ Dashboard summary performance indexes created successfully');
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes in reverse order
    await queryInterface.removeIndex('HouseStatusIndexes', 'idx_house_status_indexes_house_dashboard');
    await queryInterface.removeIndex('UserFinances', 'idx_user_finances_user_dashboard');
    await queryInterface.removeIndex('HouseServices', 'idx_house_services_house_dashboard');
    await queryInterface.removeIndex('BillSubmissions', 'idx_bill_submissions_user_status_dashboard');
    await queryInterface.removeIndex('Bills', 'idx_bills_house_created_dashboard');
    await queryInterface.removeIndex('UrgentMessages', 'idx_urgent_messages_user_resolved_dashboard');
    await queryInterface.removeIndex('Notifications', 'idx_notifications_user_read_dashboard');
    await queryInterface.removeIndex('Tasks', 'idx_tasks_user_status_dashboard');
    await queryInterface.removeIndex('Charges', 'idx_charges_user_status_due_dashboard');
    await queryInterface.removeIndex('Charges', 'idx_charges_user_due_date_dashboard');
    await queryInterface.removeIndex('Charges', 'idx_charges_user_status_dashboard');

    console.log('✅ Dashboard summary performance indexes removed successfully');
  }
}; 
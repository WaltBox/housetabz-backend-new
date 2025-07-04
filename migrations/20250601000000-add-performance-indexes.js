'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes for frequently queried fields
    
    // Bills
    await queryInterface.addIndex('Bills', ['houseId', 'status']);
    await queryInterface.addIndex('Bills', ['houseId', 'createdAt']);
    await queryInterface.addIndex('Bills', ['status', 'dueDate']);
    
    // Charges  
    await queryInterface.addIndex('Charges', ['userId', 'status']);
    await queryInterface.addIndex('Charges', ['billId', 'status']);
    await queryInterface.addIndex('Charges', ['status', 'dueDate']);
    
    // House Services
    await queryInterface.addIndex('HouseServices', ['houseId', 'status']);
    await queryInterface.addIndex('HouseServices', ['houseId', 'type']);
    await queryInterface.addIndex('HouseServices', ['designatedUserId', 'status']);
    
    // Notifications
    await queryInterface.addIndex('Notifications', ['userId', 'isRead']);
    await queryInterface.addIndex('Notifications', ['userId', 'createdAt']);
    
    // Service Request Bundles
    await queryInterface.addIndex('ServiceRequestBundles', ['houseId', 'status']);
    await queryInterface.addIndex('ServiceRequestBundles', ['userId', 'status']);
    
    // User Finance
    await queryInterface.addIndex('UserFinances', ['userId']);
    
    // House Finance  
    await queryInterface.addIndex('HouseFinances', ['houseId']);
    
    // Transactions
    await queryInterface.addIndex('Transactions', ['userId', 'createdAt']);
    await queryInterface.addIndex('Transactions', ['houseId', 'createdAt']);
    await queryInterface.addIndex('Transactions', ['type', 'createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes (PostgreSQL will auto-name them)
    await queryInterface.removeIndex('Bills', ['houseId', 'status']);
    await queryInterface.removeIndex('Bills', ['houseId', 'createdAt']);
    await queryInterface.removeIndex('Bills', ['status', 'dueDate']);
    
    await queryInterface.removeIndex('Charges', ['userId', 'status']);
    await queryInterface.removeIndex('Charges', ['billId', 'status']);
    await queryInterface.removeIndex('Charges', ['status', 'dueDate']);
    
    await queryInterface.removeIndex('HouseServices', ['houseId', 'status']);
    await queryInterface.removeIndex('HouseServices', ['houseId', 'type']);
    await queryInterface.removeIndex('HouseServices', ['designatedUserId', 'status']);
    
    await queryInterface.removeIndex('Notifications', ['userId', 'isRead']);
    await queryInterface.removeIndex('Notifications', ['userId', 'createdAt']);
    
    await queryInterface.removeIndex('ServiceRequestBundles', ['houseId', 'status']);
    await queryInterface.removeIndex('ServiceRequestBundles', ['userId', 'status']);
    
    await queryInterface.removeIndex('UserFinances', ['userId']);
    await queryInterface.removeIndex('HouseFinances', ['houseId']);
    
    await queryInterface.removeIndex('Transactions', ['userId', 'createdAt']);
    await queryInterface.removeIndex('Transactions', ['houseId', 'createdAt']);
    await queryInterface.removeIndex('Transactions', ['type', 'createdAt']);
  }
}; 
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing fields to Notifications table
    const tableInfo = await queryInterface.describeTable('Notifications');
    
    // Add title field if it doesn't exist
    if (!tableInfo.title) {
      await queryInterface.addColumn('Notifications', 'title', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    
    // Add type field if it doesn't exist
    if (!tableInfo.type) {
      await queryInterface.addColumn('Notifications', 'type', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'general'
      });
    }
    
    // Add metadata field if it doesn't exist
    if (!tableInfo.metadata) {
      await queryInterface.addColumn('Notifications', 'metadata', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      });
    }
    
    // Change message field to TEXT if it's currently STRING
    if (tableInfo.message && tableInfo.message.type === 'VARCHAR(255)') {
      await queryInterface.changeColumn('Notifications', 'message', {
        type: Sequelize.TEXT,
        allowNull: false
      });
    }
    
    // Add indexes for better performance
    await queryInterface.addIndex('Notifications', ['type'], {
      name: 'idx_notifications_type',
      concurrently: true
    });
    
    await queryInterface.addIndex('Notifications', ['userId', 'type'], {
      name: 'idx_notifications_user_type',
      concurrently: true
    });
    
    // Add GIN index for metadata JSONB queries
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_metadata_gin 
      ON "Notifications" USING GIN (metadata);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('Notifications', 'idx_notifications_type');
    await queryInterface.removeIndex('Notifications', 'idx_notifications_user_type');
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_notifications_metadata_gin;
    `);
    
    // Remove columns
    await queryInterface.removeColumn('Notifications', 'title');
    await queryInterface.removeColumn('Notifications', 'type');
    await queryInterface.removeColumn('Notifications', 'metadata');
    
    // Revert message field back to STRING
    await queryInterface.changeColumn('Notifications', 'message', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
}; 
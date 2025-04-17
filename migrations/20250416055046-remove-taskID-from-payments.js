'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Optionally, remove the index if it exists.
    // (If your database auto-removes indexes when dropping columns, this may not be needed)
    try {
      await queryInterface.removeIndex('Payments', 'Payments_taskId');
    } catch (error) {
      console.log('Index Payments_taskId not found, skipping removal.');
    }

    // Remove the taskId column from the Payments table
    await queryInterface.removeColumn('Payments', 'taskId');
  },

  down: async (queryInterface, Sequelize) => {
    // Add the taskId column back to the Payments table.
    await queryInterface.addColumn('Payments', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Tasks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Optionally, re-create the index on taskId if required.
    await queryInterface.addIndex('Payments', ['taskId'], {
      name: 'Payments_taskId'
    });
  }
};

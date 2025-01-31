'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, modify the paymentStatus ENUM type
    await queryInterface.changeColumn('Tasks', 'paymentStatus', {
      type: Sequelize.ENUM('not_required', 'pending', 'completed', 'failed'),
      defaultValue: 'not_required'
    });

    // Add any new columns if needed
    await queryInterface.addColumn('Tasks', 'paymentDueDate', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'paymentStatus'
    });

    // Add index for performance
    await queryInterface.addIndex('Tasks', ['paymentStatus']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the new column
    await queryInterface.removeColumn('Tasks', 'paymentDueDate');

    // Revert paymentStatus ENUM
    await queryInterface.changeColumn('Tasks', 'paymentStatus', {
      type: Sequelize.ENUM('not_required', 'pending', 'completed'),
      defaultValue: 'not_required'
    });

    // Remove index
    await queryInterface.removeIndex('Tasks', ['paymentStatus']);
  }
};
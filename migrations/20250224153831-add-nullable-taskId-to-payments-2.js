'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First remove the foreign key constraint
    await queryInterface.removeConstraint('Payments', 'Payments_taskId_fkey');
    
    // Then modify the column to allow NULL
    await queryInterface.changeColumn('Payments', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Tasks',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Restore the NOT NULL constraint
    await queryInterface.changeColumn('Payments', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Tasks',
        key: 'id'
      }
    });
  }
};
// migrations/YYYYMMDDHHMMSS-add-stripe-fields.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add pledged field to Tasks table
 
    // // Add failureCount to Payments table
    // await queryInterface.addColumn('Payments', 'failureCount', {
    //   type: Sequelize.INTEGER,
    //   defaultValue: 0,
    //   allowNull: false
    // });

    // // Add lastFailureReason to Payments table
    // await queryInterface.addColumn('Payments', 'lastFailureReason', {
    //   type: Sequelize.STRING,
    //   allowNull: true
    // });

   


  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Tasks', 'pledged');
    await queryInterface.removeColumn('Payments', 'failureCount');
    await queryInterface.removeColumn('Payments', 'lastFailureReason');
    await queryInterface.removeIndex('Tasks', ['pledged']);
    await queryInterface.removeIndex('Payments', ['status']);
  }
};
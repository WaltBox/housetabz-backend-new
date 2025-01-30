'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ServiceRequestBundles', 'totalPaidUpfront', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ServiceRequestBundles', 'totalPaidUpfront');
  }
};
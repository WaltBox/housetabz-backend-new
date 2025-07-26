'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('HouseServiceLedgers', 'serviceFeeTotal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Total service fees for this ledger cycle'
    });

    await queryInterface.addColumn('HouseServiceLedgers', 'totalRequired', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Total amount required including base amount and service fees'
    });

    // Add an index for performance
    await queryInterface.addIndex('HouseServiceLedgers', ['houseServiceId', 'status'], {
      name: 'idx_house_service_ledger_service_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('HouseServiceLedgers', 'idx_house_service_ledger_service_status');
    await queryInterface.removeColumn('HouseServiceLedgers', 'totalRequired');
    await queryInterface.removeColumn('HouseServiceLedgers', 'serviceFeeTotal');
  }
}; 
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, update the 'pending' values to 'unpaid'
    await queryInterface.sequelize.query(`
      UPDATE "Charges"
      SET "status" = 'unpaid'
      WHERE "status" = 'pending'
    `);

    // Then, modify the column's validation
    await queryInterface.changeColumn('Charges', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unpaid',
    });
  },

  async down(queryInterface, Sequelize) {
    // First, update the 'unpaid' values back to 'pending'
    await queryInterface.sequelize.query(`
      UPDATE "Charges"
      SET "status" = 'pending'
      WHERE "status" = 'unpaid'
    `);

    // Then, revert the column definition
    await queryInterface.changeColumn('Charges', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pending',
    });
  }
};
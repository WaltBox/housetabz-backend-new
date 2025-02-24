'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Change errorMessage field to TEXT type in Payments table
    await queryInterface.changeColumn('Payments', 'errorMessage', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    // Change errorMessage field to TEXT type in Charges table too
    await queryInterface.changeColumn('Charges', 'errorMessage', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to VARCHAR(255)
    await queryInterface.changeColumn('Payments', 'errorMessage', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.changeColumn('Charges', 'errorMessage', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  }
};
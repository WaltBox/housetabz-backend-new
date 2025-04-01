'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HouseServices', 'feeCategory', {
      type: Sequelize.ENUM('card', 'marketplace'),
      allowNull: false,
      defaultValue: 'marketplace',
      comment: 'Determines the fee: "card" implies a $2 fee per roommate, "marketplace" implies $0 fee'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('HouseServices', 'feeCategory');
    // Optional: drop the ENUM type if your database requires it (e.g., Postgres)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_HouseServices_feeCategory";');
  }
};

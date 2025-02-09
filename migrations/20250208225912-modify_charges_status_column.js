'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, remove the enum constraint
    await queryInterface.sequelize.query('ALTER TABLE "Charges" ALTER COLUMN status DROP DEFAULT;');
    await queryInterface.sequelize.query('ALTER TABLE "Charges" ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR;');
    
    // Then set it back up as a STRING with the default
    await queryInterface.changeColumn('Charges', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // If you need to revert, convert back to ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Charges_status";');
    await queryInterface.sequelize.query('CREATE TYPE "enum_Charges_status" AS ENUM (\'pending\', \'processing\', \'paid\', \'failed\');');
    
    await queryInterface.changeColumn('Charges', 'status', {
      type: 'enum_Charges_status',
      allowNull: false,
      defaultValue: 'pending'
    });
  }
};
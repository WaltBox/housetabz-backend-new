module.exports = {
  up: async (queryInterface) => {
    console.log('Starting migration: Dropping tables and columns.');

    // Drop the 'partners' table
    try {
      await queryInterface.dropTable('Partners');
      console.log('Table "partners" dropped successfully.');
    } catch (error) {
      console.error('Error dropping table "partners":', error.message);
    }

    // Drop 'partner_id' column from 'DealPartners'
    try {
      await queryInterface.removeColumn('DealPartners', 'partner_id');
      console.log('Column "partner_id" removed from "DealPartners".');
    } catch (error) {
      console.error('Error removing column "partner_id" from "DealPartners":', error.message);
    }

    // Drop 'partner_id' column from 'Deals'
    try {
      await queryInterface.removeColumn('Deals', 'partner_id');
      console.log('Column "partner_id" removed from "Deals".');
    } catch (error) {
      console.error('Error removing column "partner_id" from "Deals":', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Optionally recreate the dropped table and columns here for rollback
    console.log('Rollback not implemented.');
  },
};

module.exports = {
  up: async (queryInterface) => {
    console.log('Starting migration to drop "partners" table.');
    try {
      await queryInterface.dropTable('Partners');
      console.log('Table "partners" dropped successfully.');
    } catch (error) {
      console.error('Error while dropping "partners" table:', error.message);
      throw error; // Ensure the migration fails if this step does not succeed
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Optionally recreate the table for rollback
    console.log('Rollback not implemented for dropping "partners" table.');
  },
};

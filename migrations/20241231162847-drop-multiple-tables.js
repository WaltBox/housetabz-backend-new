module.exports = {
  up: async (queryInterface) => {
    const tablesToDrop = [
      'ServicePlans',
      'rhythm_offer_requests',
      'SparklyRequests',
      'customer_validations',
      'Forms',
      'Parameters',
    ];

    for (const table of tablesToDrop) {
      console.log(`Attempting to drop table: ${table}`);
      await queryInterface.dropTable(table, { cascade: true }).catch((error) => {
        console.error(`Error dropping table ${table}:`, error.message);
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Leave empty unless you want to recreate the tables later
  },
};

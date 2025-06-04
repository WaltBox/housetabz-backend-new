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
    
      await queryInterface.dropTable(table, { cascade: true }).catch((error) => {
     
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Leave empty unless you want to recreate the tables later
  },
};

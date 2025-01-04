'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('PartnerKeys', [
      {
        partnerId: 1, // Replace with actual partner ID
        api_key: 'TEST_API_KEY_1',
        secret_key: 'TEST_SECRET_KEY_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('PartnerKeys', null, {});
  },
};

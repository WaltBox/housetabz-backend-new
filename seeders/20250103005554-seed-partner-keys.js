'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('PartnerKeys', [
      {
        partnerId: 9, // Replace with actual partner ID
        api_key: 'walt_is_awesome_API_KEY_2',
        secret_key: 'walt_is_so_cool_SECRET_KEY_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('PartnerKeys', null, {});
  },
};

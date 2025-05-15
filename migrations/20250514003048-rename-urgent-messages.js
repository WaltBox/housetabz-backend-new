'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('urgent_messages', 'UrgentMessages');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('UrgentMessages', 'urgent_messages');
  }
};

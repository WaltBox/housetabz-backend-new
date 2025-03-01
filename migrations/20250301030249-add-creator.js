'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Houses', 'creator_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Houses', 'creator_id');
  }
};

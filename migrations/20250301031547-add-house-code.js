'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Houses', 'house_code', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Houses', 'house_code');
  }
};

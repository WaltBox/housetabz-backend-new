'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename the table
    await queryInterface.renameTable('HouseStatusIndices', 'HouseStatusIndexes');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the rename in case of rollback
    await queryInterface.renameTable('HouseStatusIndexes', 'HouseStatusIndices');
  }
};
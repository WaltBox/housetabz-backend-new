'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if resetCodeHash exists
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.resetCodeHash) {
      // If resetCodeHash exists, rename it to resetCode
      return queryInterface.renameColumn('Users', 'resetCodeHash', 'resetCode');
    }
    return Promise.resolve(); // Do nothing if resetCodeHash doesn't exist
  },

  down: async (queryInterface, Sequelize) => {
    // Check if resetCode exists
    const tableInfo = await queryInterface.describeTable('Users');
    
    if (tableInfo.resetCode) {
      // If resetCode exists, rename it back to resetCodeHash
      return queryInterface.renameColumn('Users', 'resetCode', 'resetCodeHash');
    }
    return Promise.resolve(); // Do nothing if resetCode doesn't exist
  }
};
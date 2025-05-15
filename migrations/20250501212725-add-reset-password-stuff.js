'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if resetCode and resetCodeExpires already exist
    const tableInfo = await queryInterface.describeTable('Users');
    
    const changes = [];
    
    // If resetCode exists but is not named resetCodeHash, rename it
    if (tableInfo.resetCode) {
      changes.push(
        queryInterface.renameColumn('Users', 'resetCode', 'resetCodeHash')
      );
    } else if (!tableInfo.resetCodeHash) {
      // If neither exists, add resetCodeHash
      changes.push(
        queryInterface.addColumn('Users', 'resetCodeHash', {
          type: Sequelize.STRING,
          allowNull: true
        })
      );
    }
    
    // Add resetCodeExpires if it doesn't exist
    if (!tableInfo.resetCodeExpires) {
      changes.push(
        queryInterface.addColumn('Users', 'resetCodeExpires', {
          type: Sequelize.DATE,
          allowNull: true
        })
      );
    }
    
    return Promise.all(changes);
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Users');
    
    const changes = [];
    
    // If resetCodeHash exists, rename it back to resetCode
    if (tableInfo.resetCodeHash) {
      changes.push(
        queryInterface.renameColumn('Users', 'resetCodeHash', 'resetCode')
      );
    }
    
    // Remove resetCodeExpires if it exists
    if (tableInfo.resetCodeExpires) {
      changes.push(
        queryInterface.removeColumn('Users', 'resetCodeExpires')
      );
    }
    
    return Promise.all(changes);
  }
};
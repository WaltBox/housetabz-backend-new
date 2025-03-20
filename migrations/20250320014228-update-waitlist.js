'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('WaitLists', 'memeQRCodeId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'MemeQRCodes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('WaitLists', 'memeQRCodeId');
  }
};
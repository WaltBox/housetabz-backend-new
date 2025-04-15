'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Bills', 'createdBy');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Bills', 'createdBy', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    });
  }
};

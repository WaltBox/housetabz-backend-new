'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeColumn('HouseServices', 'association_id');
    await queryInterface.removeColumn('HouseServices', 'association_type');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HouseServices', 'association_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('HouseServices', 'association_type', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};

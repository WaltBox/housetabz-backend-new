'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Partners', 'person_of_contact', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Partners', 'phone_number', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Partners', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Partners', 'person_of_contact');
    await queryInterface.removeColumn('Partners', 'phone_number');
    await queryInterface.removeColumn('Partners', 'email');
  },
};

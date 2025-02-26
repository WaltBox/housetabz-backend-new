'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HouseServices', 'reminderDay', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Day of month when to remind users to enter variable bill amounts (for variable_recurring)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('HouseServices', 'reminderDay');
  }
};
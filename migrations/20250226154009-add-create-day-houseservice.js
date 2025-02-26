// src/migrations/[timestamp]-add-create-day-to-house-services.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HouseServices', 'createDay', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Day of month when bill should be created'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('HouseServices', 'createDay');
  }
};
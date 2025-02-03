"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Partners", "link", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "URL to the partner landing page",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Partners", "link");
  }
};

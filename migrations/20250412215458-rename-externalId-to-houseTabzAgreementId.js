'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'HouseServices',
      'externalId',
      'houseTabzAgreementId'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'HouseServices',
      'houseTabzAgreementId',
      'externalId'
    );
  }
};

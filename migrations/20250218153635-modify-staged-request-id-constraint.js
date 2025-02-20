'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "ServiceRequestBundles" ALTER COLUMN "stagedRequestId" DROP NOT NULL;'
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "ServiceRequestBundles" ALTER COLUMN "stagedRequestId" SET NOT NULL;'
    );
  }
};
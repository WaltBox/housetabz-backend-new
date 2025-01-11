'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('WaitLists', 'referrerId', {
      type: Sequelize.UUID,
      allowNull: true, // Nullable for users without a referral
      references: {
        model: 'Referrers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('WaitLists', 'referrerId');
  },
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ServiceRequestBundles', 'stagedRequestId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'StagedRequests',
        key: 'id',
      },
      onDelete: 'CASCADE',
      allowNull: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ServiceRequestBundles', 'stagedRequestId');
  },
};

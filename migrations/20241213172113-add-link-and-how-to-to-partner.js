module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Partners', 'link', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Partners', 'how_to', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Partners', 'link');
    await queryInterface.removeColumn('Partners', 'how_to');
  },
};

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('partners');
  },

  down: async (queryInterface, Sequelize) => {
    // Optionally, leave this empty if you don't want to recreate the table during rollback.
  },
};

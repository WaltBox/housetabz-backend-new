'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the tasks table
    await queryInterface.dropTable('Tasks');

    // Drop the serviceRequestBundles table
    await queryInterface.dropTable('ServiceRequestBundles');
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate the serviceRequestBundles table
    await queryInterface.createTable('ServiceRequestBundles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      houseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      roommate_accepted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Recreate the tasks table
    await queryInterface.createTable('Tasks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      serviceRequestBundleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ServiceRequestBundles',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      response: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isIn: [['accepted', 'rejected']],
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },
};

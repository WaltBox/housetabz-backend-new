'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('urgent_messages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      house_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Houses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      bill_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Bills', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      charge_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Charges', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.STRING(32),
        allowNull: false
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex(
      'urgent_messages',
      ['charge_id', 'user_id', 'type'],
      {
        unique: true,
        name: 'urgent_messages_unique_charge_user_type'
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('urgent_messages');
  }
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop existing table and enum
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS "Payments" CASCADE;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status" CASCADE;', { transaction });

      // Create new enum with lowercase name
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_payments_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
      `, { transaction });

      // Create new Payments table with correct enum reference
      await queryInterface.createTable('Payments', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        taskId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Tasks',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0
          }
        },
        status: {
          type: '"enum_payments_status"',
          allowNull: false,
          defaultValue: 'pending'
        },
        stripePaymentIntentId: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        stripePaymentMethodId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        errorMessage: {
          type: Sequelize.STRING,
          allowNull: true
        },
        retryCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        metadata: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        paymentDate: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });

      // Add indexes
      await queryInterface.addIndex('Payments', ['status'], {
        name: 'payments_status_idx',
        transaction
      });

      await queryInterface.addIndex('Payments', ['stripePaymentIntentId'], {
        name: 'payments_stripe_payment_intent_id_idx',
        transaction
      });

      await queryInterface.addIndex('Payments', ['userId'], {
        name: 'payments_user_id_idx',
        transaction
      });

      await queryInterface.addIndex('Payments', ['taskId'], {
        name: 'payments_task_id_idx',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop table and enum
      await queryInterface.dropTable('Payments', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status" CASCADE;', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
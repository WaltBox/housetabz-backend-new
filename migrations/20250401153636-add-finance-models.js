// migrations/YYYYMMDDHHMMSS-add-finance-models.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create UserFinances table
    await queryInterface.createTable('UserFinances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      balance: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      credit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lastTransactionDate: {
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
    });

    // Create HouseFinances table
    await queryInterface.createTable('HouseFinances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      houseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Houses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      balance: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      ledger: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      lastTransactionDate: {
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
    });

    // Create Transactions table
    await queryInterface.createTable('Transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      houseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Houses',
          key: 'id'
        }
      },
      type: {
        type: Sequelize.ENUM('CHARGE', 'PAYMENT', 'TRANSFER', 'CREDIT', 'CREDIT_USAGE', 'ADJUSTMENT', 'FEE', 'REFUND'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      balanceBefore: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      balanceAfter: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED'),
        allowNull: false,
        defaultValue: 'COMPLETED'
      },
      billId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Bills',
          key: 'id'
        }
      },
      chargeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Charges',
          key: 'id'
        }
      },
      paymentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Payments',
          key: 'id'
        }
      },
      relatedTransactionId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      externalReferenceId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes
    await queryInterface.addIndex('UserFinances', ['userId']);
    await queryInterface.addIndex('HouseFinances', ['houseId']);
    await queryInterface.addIndex('Transactions', ['userId']);
    await queryInterface.addIndex('Transactions', ['houseId']);
    await queryInterface.addIndex('Transactions', ['type']);
    await queryInterface.addIndex('Transactions', ['billId']);
    await queryInterface.addIndex('Transactions', ['chargeId']);
    await queryInterface.addIndex('Transactions', ['paymentId']);
    await queryInterface.addIndex('Transactions', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Transactions');
    await queryInterface.dropTable('UserFinances');
    await queryInterface.dropTable('HouseFinances');
  }
};
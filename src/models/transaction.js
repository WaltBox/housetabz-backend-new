// src/models/transaction.js
module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User associated with this transaction, may be null for house-only transactions'
    },
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Houses',
        key: 'id'
      },
      comment: 'House associated with this transaction, may be null for user-only transactions'
    },
    type: {
      type: DataTypes.ENUM(
        'CHARGE',           // Adding to balance (new bill)
        'PAYMENT',          // User payment (regular payment)
        'ADVANCE',          // HouseTabz advances payment ← NEW
        'ADVANCE_REPAYMENT', // User repays advanced amount ← NEW
        'TRANSFER',         // Moving funds between users
        'CREDIT',           // Adding credit to an account (legacy)
        'CREDIT_USAGE',     // Using credit from an account (legacy - will migrate to ADVANCE)
        'ADJUSTMENT',       // Manual balance adjustment
        'FEE',             // Service or processing fee
        'REFUND'           // Refund to a user
      ),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get() {
        const value = this.getDataValue('amount');
        return value === null ? 0.00 : Number(value);
      },
      set(value) {
        this.setDataValue('amount', parseFloat(value || 0).toFixed(2));
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED'),
      allowNull: false,
      defaultValue: 'COMPLETED'
    },
    billId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Bills',
        key: 'id'
      }
    },
    chargeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Charges',
        key: 'id'
      }
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Payments',
        key: 'id'
      }
    },
    relatedTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    externalReferenceId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'Transactions',
    indexes: [
      { fields: ['userId'] },
      { fields: ['houseId'] },
      { fields: ['type'] },
      { fields: ['billId'] },
      { fields: ['chargeId'] },
      { fields: ['paymentId'] },
      { fields: ['createdAt'] }
    ]
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Transaction.belongsTo(models.House, {
      foreignKey: 'houseId',
      as: 'house'
    });

    Transaction.belongsTo(models.Bill, {
      foreignKey: 'billId',
      as: 'bill'
    });

    Transaction.belongsTo(models.Charge, {
      foreignKey: 'chargeId',
      as: 'charge'
    });

    Transaction.belongsTo(models.Payment, {
      foreignKey: 'paymentId',
      as: 'payment'
    });

    Transaction.belongsTo(models.Transaction, {
      foreignKey: 'relatedTransactionId',
      as: 'relatedTransaction'
    });
  };

  return Transaction;
};
// models/Payment.js
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tasks',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.STRING,  // Changed from ENUM to STRING
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'processing', 'completed', 'failed']]  // Validation moved here
      }
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    stripePaymentMethodId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    idempotencyKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'idempotency_key'
    }
  }, {
    indexes: [
      { fields: ['status'] },
      { fields: ['stripePaymentIntentId'] },
      { fields: ['userId'] },
      { fields: ['taskId'] }
    ]
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Task, {
      foreignKey: 'taskId',
      as: 'task'
    });
    Payment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Payment;
};
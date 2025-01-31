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
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'For future use with real payment processor'
      },
      transactionId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'For future use with real payment processor'
      },
      paymentDate: {
        type: DataTypes.DATE,
        allowNull: true
      }
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
  
// src/models/TakeOverRequest.js
module.exports = (sequelize, DataTypes) => {
    const TakeOverRequest = sequelize.define('TakeOverRequest', {
      serviceName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      accountNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      serviceType: {
        type: DataTypes.STRING,
        defaultValue: 'take_over',
        allowNull: false,
      },
      monthlyAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Monthly recurring amount for this service'
      },
      dueDate: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 31
        },
        comment: 'Day of month payment is due'
      },
      requiredUpfrontPayment: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Any upfront amount needed'
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [['pending', 'active', 'cancelled']],
            msg: 'Status must be either pending, active, or cancelled'
          }
        }
      }
    });
  
    TakeOverRequest.associate = function(models) {
      TakeOverRequest.hasOne(models.ServiceRequestBundle, {
        foreignKey: 'takeOverRequestId',
        as: 'serviceRequestBundle'
      });
    };
  
    return TakeOverRequest;
  };
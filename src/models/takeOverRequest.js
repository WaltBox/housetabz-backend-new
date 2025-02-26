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
      defaultValue: 'fixed',
      allowNull: false,
      validate: {
        isIn: {
          args: [['fixed', 'variable']],
          msg: 'Service type must be either fixed or variable'
        }
      }
    },
    monthlyAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // Changed to true to allow null for variable services
      comment: 'Monthly recurring amount for fixed services (null for variable services)',
      get() {
        const value = this.getDataValue('monthlyAmount');
        return value === null ? null : Number(value);
      },
      set(value) {
        if (value !== null && value !== undefined) {
          this.setDataValue('monthlyAmount', Number(value).toFixed(2));
        } else {
          this.setDataValue('monthlyAmount', null);
        }
      },
      validate: {
        isValidAmount(value) {
          // Only validate if service type is fixed
          if (this.serviceType === 'fixed' && (value === null || value === undefined)) {
            throw new Error('Monthly amount is required for fixed services');
          }
        }
      }
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
      defaultValue: 0.00,
      comment: 'Any upfront amount needed',
      get() {
        const value = this.getDataValue('requiredUpfrontPayment');
        return value === null ? 0.00 : Number(value);
      },
      set(value) {
        if (value !== null && value !== undefined) {
          this.setDataValue('requiredUpfrontPayment', Number(value).toFixed(2));
        } else {
          this.setDataValue('requiredUpfrontPayment', 0.00);
        }
      }
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
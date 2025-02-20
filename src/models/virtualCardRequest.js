module.exports = (sequelize, DataTypes) => {
  const VirtualCardRequest = sequelize.define('VirtualCardRequest', {
    serviceName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceType: {
      type: DataTypes.STRING,
      defaultValue: 'virtual_card',
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
      comment: 'Any upfront amount needed (security deposit, etc)'
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
    },
    virtualCardId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe virtual card ID once created'
    }
  });

  VirtualCardRequest.associate = function(models) {
    VirtualCardRequest.hasOne(models.ServiceRequestBundle, {
      foreignKey: 'virtualCardRequestId',
      as: 'serviceRequestBundle'
    });
  };

  return VirtualCardRequest;
};
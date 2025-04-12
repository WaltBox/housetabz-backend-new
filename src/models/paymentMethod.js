module.exports = (sequelize, DataTypes) => {
    const PaymentMethod = sequelize.define('PaymentMethod', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      stripePaymentMethodId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      type: {
        type: DataTypes.ENUM('card', 'bank_account', 'housetabz'),
        allowNull: false
      },
      last4: {
        type: DataTypes.STRING,
        allowNull: false
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    });
  
    PaymentMethod.associate = (models) => {
      PaymentMethod.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      PaymentMethod.belongsTo(models.StripeCustomer, {
        foreignKey: 'stripeCustomerId',
        as: 'stripeCustomer'
      });
    };
  
    return PaymentMethod;
  };
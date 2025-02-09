module.exports = (sequelize, DataTypes) => {
    const StripeCustomer = sequelize.define('StripeCustomer', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      defaultPaymentMethodId: {
        type: DataTypes.STRING,
        allowNull: true
      }
    });
  
    StripeCustomer.associate = (models) => {
      StripeCustomer.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      StripeCustomer.hasMany(models.PaymentMethod, {
        foreignKey: 'stripeCustomerId',
        as: 'paymentMethods'
      });
    };
  
    return StripeCustomer;
  };
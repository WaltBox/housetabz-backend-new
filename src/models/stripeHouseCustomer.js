// src/models/StripeHouseCustomer.js

module.exports = (sequelize, DataTypes) => {
    const StripeHouseCustomer = sequelize.define('StripeHouseCustomer', {
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Houses',
          key: 'id'
        },
        validate: {
          notNull: { msg: 'House ID is required' }
        }
      },
      stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      stripeCardholderId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: {
            args: [['active', 'inactive']],
            msg: 'Status must be either active or inactive'
          }
        }
      }
    });
  
    StripeHouseCustomer.associate = (models) => {
      StripeHouseCustomer.belongsTo(models.House, {
        foreignKey: 'houseId',
        as: 'house'
      });
    };
  
    return StripeHouseCustomer;
  };
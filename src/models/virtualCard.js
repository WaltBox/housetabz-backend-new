// src/models/VirtualCard.js
module.exports = (sequelize, DataTypes) => {
    const VirtualCard = sequelize.define('VirtualCard', {
      stripeCardId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      virtualCardRequestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'VirtualCardRequests',
          key: 'id'
        }
      },
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Houses',
          key: 'id'
        }
      },
      last4: {
        type: DataTypes.STRING,
        allowNull: false
      },
      expMonth: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      expYear: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: [['active', 'inactive', 'cancelled']]
        }
      },
      monthlyLimit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      }
    });
  
    VirtualCard.associate = function(models) {
      VirtualCard.belongsTo(models.VirtualCardRequest, {
        foreignKey: 'virtualCardRequestId',
        as: 'virtualCardRequest'
      });
      VirtualCard.belongsTo(models.House, {
        foreignKey: 'houseId',
        as: 'house'
      });
    };
  
    return VirtualCard;
  };
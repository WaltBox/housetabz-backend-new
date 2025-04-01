// src/models/HouseStatusIndex.js
module.exports = (sequelize, DataTypes) => {
    const HouseStatusIndex = sequelize.define('HouseStatusIndex', {
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50,
        validate: { min: 0, max: 100 }
      },
      bracket: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: 'HSI bracket (0-10) for fee calculations'
      },
      feeMultiplier: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1.0,
        comment: 'Multiplier applied to service fees'
      },
      creditMultiplier: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false, 
        defaultValue: 1.0,
        comment: 'Multiplier applied to credit limits'
      },
      updatedReason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Reason for the last HSI update'
      },
      // Explicitly define the foreign key field
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Houses',  // Ensure this matches your House table name exactly
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    }, {
      tableName: 'HouseStatusIndexes'
    });
  
    HouseStatusIndex.associate = (models) => {
      HouseStatusIndex.belongsTo(models.House, {
        foreignKey: 'houseId',
        as: 'house'
      });
    };
  
    return HouseStatusIndex;
  };
  
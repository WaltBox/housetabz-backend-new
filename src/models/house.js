// src/models/house.js
const { Model, DataTypes } = require('sequelize');

function generateHouseCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = (sequelize) => {
  class House extends Model {}

  House.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^[A-Z]{2}$/,
        },
      },
      zip_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Financial fields removed (hsi, balance, ledger)
      creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      house_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        defaultValue: () => generateHouseCode(),
      },
    },
    {
      sequelize,
      modelName: 'House',
      hooks: {
        beforeCreate: (house) => {
          if (!house.house_code) {
            house.house_code = generateHouseCode();
          }
        },
        afterCreate: async (house, options) => {
          // Create HouseStatusIndex
          const { HouseStatusIndex } = sequelize.models;
          if (HouseStatusIndex) {
            await HouseStatusIndex.create(
              {
                houseId: house.id,
                score: 50,
                bracket: 5,
                feeMultiplier: 1.0,
                creditMultiplier: 1.0,
                updatedReason: 'Initial default',
              },
              { transaction: options.transaction }
            );
          }
          
          // Create HouseFinance
          const { HouseFinance } = sequelize.models;
          if (HouseFinance) {
            await HouseFinance.create(
              {
                houseId: house.id,
                balance: 0.00,
                ledger: 0.00,
              },
              { transaction: options.transaction }
            );
          }
        },
      },
    }
  );

  House.associate = (models) => {
    House.hasMany(models.User, { foreignKey: 'houseId', as: 'users' });
    House.hasMany(models.Bill, { foreignKey: 'houseId', as: 'bills' });
    House.hasOne(models.HouseStatusIndex, { foreignKey: 'houseId', as: 'statusIndex' });
    
    // New association to HouseFinance
    House.hasOne(models.HouseFinance, { foreignKey: 'houseId', as: 'finance' });
    // New association to Transaction
    House.hasMany(models.Transaction, { foreignKey: 'houseId', as: 'transactions' });
  };

  return House;
};
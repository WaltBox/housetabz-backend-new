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
      hsi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        get() {
          const value = this.getDataValue('balance');
          return value === null ? 0.00 : Number(value);
        },
        set(value) {
          this.setDataValue('balance', parseFloat(value || 0).toFixed(2));
        },
      },
      ledger: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      house_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        defaultValue: () => generateHouseCode(), // Auto-generate the code
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
          // Access the HouseStatusIndex model from the sequelize instance
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
        },
      },
    }
  );

  House.associate = (models) => {
    House.hasMany(models.User, { foreignKey: 'houseId', as: 'users' });
    House.hasMany(models.Bill, { foreignKey: 'houseId', as: 'bills' });
  };

  return House;
};

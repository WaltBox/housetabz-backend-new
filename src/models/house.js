const axios = require('axios');
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class House extends Model {
  
  }

  // Initialize the House model with relevant fields and validations
  House.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address_line: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      secondary_line: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^[A-Z]{2}$/, // Validate as two-letter state code
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
        }
      },
      ledger: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      meter_id: {
        type: DataTypes.STRING,
        allowNull: true, // Allow null initially
      },
      utility_id: {
        type: DataTypes.STRING,
        allowNull: true, // Allow null initially
      },
    },
    {
      sequelize,
      modelName: 'House',
    }
  );

  // Hook to run after a house is created
  // House.afterCreate(async (house) => {
  //   console.log('House created. Now attempting to update with API data...');

  // });

  House.associate = (models) => {
    House.hasMany(models.User, { foreignKey: 'houseId', as: 'users' }); // Associate House with Users
    House.hasMany(models.Bill, { foreignKey: 'houseId', as: 'bills' }); // Associate House with Bills
  };

  return House;
};

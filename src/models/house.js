const axios = require('axios');
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class House extends Model {
    /**
     * Updates the house with meter_id and utility_id from the API response.
     * @param {House} house - The house instance to update.
     */
    // static async updateMeterAndUtility(house) {
    //   try {
    //     const response = await axios.post('http://localhost:3000/api/v2/addresses/availability', {
    //       address_line: house.address_line,
    //       secondary_line: house.secondary_line,
    //       city: house.city,
    //       state: house.state,
    //       zip_code: house.zip_code,
    //     });

    //     console.log('API Response:', response.data); // Log the API response

    //     // Extract data from the correct API response structure
    //     const addressData = response.data?.address;

    //     if (addressData) {
    //       const { meter_id, utility_id } = addressData;

    //       // Update the house instance with meter_id and utility_id
    //       await house.update({ meter_id, utility_id });

    //       console.log('House successfully updated with meter_id and utility_id:', { 
    //         meter_id, utility_id 
    //       });
    //     } else {
    //       console.warn('No address data found in API response.');
    //     }
    //   } catch (error) {
    //     console.error('Error updating meter_id and utility_id:', error);
    //   }
    // }
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
  House.afterCreate(async (house) => {
    console.log('House created. Now attempting to update with API data...');
    await House.updateMeterAndUtility(house); // Call the update function here
  });

  House.associate = (models) => {
    House.hasMany(models.User, { foreignKey: 'houseId', as: 'users' }); // Associate House with Users
    House.hasMany(models.Bill, { foreignKey: 'houseId', as: 'bills' }); // Associate House with Bills
  };

  return House;
};

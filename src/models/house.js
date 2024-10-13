const axios = require('axios');


module.exports = (sequelize, DataTypes) => {

  const House = sequelize.define('House', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address_line: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'N/A',  // Default value for
    },
    secondary_line: {
      type: DataTypes.STRING,
      allowNull: true,  // This field is optional
      defaultValue: 'N/A',  // Default value for
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'N/A',  // Default value for
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[A-Z]{2}$/i,  // Ensures the state is a two-letter code
      },

      defaultValue: 'N/A',  // Default value for
    },
    zip_code: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'N/A',  // Default value for
    },
    hsi: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,  // Default value for house status index
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,  // Default value for balance
    },
    ledger: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,  // Default value for ledger
    },
  });

  House.associate = (models) => {
    House.hasMany(models.User, {
      foreignKey: 'houseId',
      as: 'users',
    });
  };

  House.afterCreate(async (house) => {
    try {
      const response = await axios.post('http://localhost:3000/api/v2/addresses/availability', {
        address_line: house.address_line,
        secondary_line: house.secondary_line,
        city: house.city,
        state: house.state,
        zip_code: house.zip_code,
      });
      console.log('Address availability checked:', response.data);
    } catch (error) {
      console.error('Error checking address availability:', error);
    }
  });
  return House;
};

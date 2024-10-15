const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomerValidation = sequelize.define(
    'CustomerValidation',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      deposit_amount: {
        type: DataTypes.STRING,
        allowNull: true, // This may be optional based on the API response
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      phone: {
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
          len: [2, 2], // State abbreviation (e.g., TX, AL)
        },
      },
      zip_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      acquisition_medium: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      acquisition_campaign: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rhythm_campaign_slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'customer_validations',
      timestamps: true, // Adds createdAt and updatedAt fields
    }
  );

  return CustomerValidation;
};

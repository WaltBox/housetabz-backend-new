'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Partner extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  Partner.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      about: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      important_information: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      marketplace_cover: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      company_cover: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      avg_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      registration_code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      person_of_contact: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      api_key: {
        type: DataTypes.STRING,
        allowNull: true, // Generated automatically and can be null initially
      },
      secret_key: {
        type: DataTypes.STRING,
        allowNull: true, // Generated automatically and can be null initially
      },
      webhook_url: {
        type: DataTypes.STRING,
        allowNull: true, // Set by the partner later
        validate: {
          isUrl: true, // Ensures it's a valid URL
        },
      },
    },
    {
      sequelize,
      modelName: 'Partner',
      tableName: 'Partners',
      underscored: true,
    }
  );

  return Partner;
};

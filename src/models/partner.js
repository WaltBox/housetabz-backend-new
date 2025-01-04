'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

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
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      webhook_url: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
    },
    {
      sequelize,
      modelName: 'Partner',
      tableName: 'Partners',
      underscored: true,
      hooks: {
        beforeSave: async (partner) => {
          if (partner.password) {
            const salt = await bcrypt.genSalt(10);
            partner.password = await bcrypt.hash(partner.password, salt);
          }
        },
      },
    }
  );

  return Partner;
};

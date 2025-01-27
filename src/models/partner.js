'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Partner extends Model {
    static associate(models) {
    
      Partner.hasMany(models.StagedRequest, {
        foreignKey: 'partnerId',
        as: 'stagedRequests'
      });

      Partner.hasMany(models.WebhookLog, {
        foreignKey: 'partner_id',
        as: 'webhookLogs'  // Make sure this matches
      });


    }

    // Instance method to verify password
    async verifyPassword(password) {
      return bcrypt.compare(password, this.password);
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
        defaultValue: '',
      },
      important_information: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '',
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
        defaultValue: 0.0,
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
        validate: {
          is: /^[\d\s\-\+()]+$/, // Regex for phone numbers
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true, // Allow null initially
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true, // Allow null initially
      },
      webhookUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      webhookSecret: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      webhookEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      }
      
    },
    {
      sequelize,
      modelName: 'Partner',
      tableName: 'Partners',
      underscored: true,
      timestamps: true, // Add timestamps
      hooks: {
        // Hash password before saving
        beforeSave: async (partner) => {
          try {
            if (partner.changed('password')) {
              const salt = await bcrypt.genSalt(10);
              partner.password = await bcrypt.hash(partner.password, salt);
            }
          } catch (error) {
            console.error('Error hashing password:', error);
            throw new Error('Failed to hash password.');
          }
        },
      },
    }
  );

  return Partner;
};

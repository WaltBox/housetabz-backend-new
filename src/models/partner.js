'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Partner extends Model {
    static associate(models) {
      // Existing associations
      Partner.hasMany(models.StagedRequest, {
        foreignKey: 'partnerId',
        as: 'stagedRequests'
      });

      Partner.hasMany(models.WebhookLog, {
        foreignKey: 'partner_id',
        as: 'webhookLogs'
      });

      // New association for the PartnerKey
      Partner.hasOne(models.PartnerKey, {
        foreignKey: 'partnerId',
        as: 'partnerKey'
      });
    }

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
        comment: 'S3 URL for the partner logo',
      },
      logo_key: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'S3 key for the partner logo',
      },
      marketplace_cover: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'S3 URL for the marketplace cover image',
      },
      marketplace_cover_key: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'S3 key for the marketplace cover image',
      },
      company_cover: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'S3 URL for the company cover image',
      },
      company_cover_key: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'S3 key for the company cover image',
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
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
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
      },
      link: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to the partner landing page',
      },
    },
    {
      sequelize,
      modelName: 'Partner',
      tableName: 'Partners',
      underscored: true,
      timestamps: true,
      hooks: {
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
        // Hook to clean up S3 files when a partner is deleted
        beforeDestroy: async (partner) => {
          try {
            const s3Service = require('./services/s3Service');
            const keys = [
              partner.logo_key,
              partner.marketplace_cover_key,
              partner.company_cover_key
            ].filter(Boolean);

            for (const key of keys) {
              await s3Service.deleteFile(key);
            }
          } catch (error) {
            console.error('Error deleting S3 files:', error);
            throw new Error('Failed to delete S3 files.');
          }
        }
      },
    }
  );

  return Partner;
};

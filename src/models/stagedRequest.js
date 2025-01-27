// models/stagedRequest.js
const webhookService = require('../services/webhookService');

module.exports = (sequelize, DataTypes) => {
  const StagedRequest = sequelize.define('StagedRequest', {
    partnerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    partnerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Partners',
        key: 'id'
      }
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pricing: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'staged',
    },
  });

  StagedRequest.associate = (models) => {
    StagedRequest.belongsTo(models.Partner, {
      foreignKey: 'partnerId',
      as: 'partner'
    });

    StagedRequest.hasOne(models.ServiceRequestBundle, {
      foreignKey: 'stagedRequestId',
      as: 'serviceRequestBundle',
    });
  };

  // When StagedRequest status changes to 'authorized', send webhook
  StagedRequest.addHook('afterUpdate', async (stagedRequest, options) => {
    if (stagedRequest.status === 'authorized') {
      try {
        await webhookService.sendWebhook(
          stagedRequest.partnerId,
          'request.authorized',
          {
            stagedRequestId: stagedRequest.id,
            transactionId: stagedRequest.transactionId,
            status: stagedRequest.status,
            serviceName: stagedRequest.serviceName,
            pricing: stagedRequest.pricing
          }
        );
      } catch (error) {
        console.error('Error sending webhook:', error);
      }
    }
  });

  return StagedRequest;
};
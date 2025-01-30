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
    serviceType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estimatedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Reference amount for users, not used for billing'
    },
    requiredUpfrontPayment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Amount that must be collected before authorization (e.g., security deposit)'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'staged',
    },
  });

  // When StagedRequest status changes to 'authorized', send webhook
  StagedRequest.addHook('afterUpdate', async (stagedRequest, options) => {
    if (stagedRequest.status === 'authorized') {
      try {
        const webhookPayload = {
          stagedRequestId: stagedRequest.id,
          transactionId: stagedRequest.transactionId,
          status: stagedRequest.status,
          serviceName: stagedRequest.serviceName,
          serviceType: stagedRequest.serviceType,
          estimatedAmount: stagedRequest.estimatedAmount,
          requiredUpfrontPayment: stagedRequest.requiredUpfrontPayment
        };

        await webhookService.sendWebhook(
          stagedRequest.partnerId,
          'request.authorized',
          webhookPayload
        );
      } catch (error) {
        console.error('Error sending webhook:', error);
      }
    }
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

  return StagedRequest;
};
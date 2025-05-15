const axios = require('axios');
module.exports = (sequelize, DataTypes) => {
  const Bill = sequelize.define('Bill', {
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Original bill amount before service fees'
    },
    serviceFeeTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Total service fees applied to the bill'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    houseService_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'partial_paid', 'paid']]
      }
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    billType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'regular',
      validate: {
        isIn: [['regular', 'fixed_recurring', 'variable_recurring']]
      }
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User ID who submitted the bill (for variable bills)'
    }
  });

  // Associations
  Bill.associate = (models) => {
    Bill.belongsTo(models.House, { 
      foreignKey: 'houseId',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    Bill.belongsTo(models.HouseService, { 
      foreignKey: 'houseService_id',
      as: 'houseService',
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION'
    });

    Bill.hasMany(models.Charge, { 
      foreignKey: 'billId'
    });

    Bill.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  };

  // Instance method to update status based on related charges
  Bill.prototype.updateStatus = async function (transaction = null) {
    const charges = await sequelize.models.Charge.findAll({
      where: { billId: this.id },
      transaction
    });
  
    const allPaid = charges.every(charge => charge.status === 'paid');
    const anyPaid = charges.some(charge => charge.status === 'paid');
  
    // Get the previous status to check if it changed
    const previousStatus = this.status;
    
    if (allPaid) {
      this.status = 'paid';
    } else if (anyPaid) {
      this.status = 'partial_paid';
    } else {
      this.status = 'pending';
    }
  
    await this.save({ transaction });
    
    // If status changed to 'paid', send webhook notification
    if (previousStatus !== 'paid' && this.status === 'paid') {
      // We need to fetch related data outside the transaction to avoid issues
      // with transaction isolation
      const afterCommitAction = async () => {
        try {
          // Get the HouseService
          const houseService = await sequelize.models.HouseService.findByPk(this.houseService_id);
          
          // Check if this is a partner-related bill
          if (houseService && 
              houseService.partnerId && 
              houseService.billingSource === 'partner' &&
              this.metadata && 
              this.metadata.externalBillId) {
            
            // For testing, use the test webhook URL directly
            const TEST_WEBHOOK_URL = 'https://webhook.site/a466ffeb-dbee-4fe7-b027-9b27343339f9';
            
            console.log(`Sending bill.paid webhook for billId: ${this.id}, externalBillId: ${this.metadata.externalBillId}`);
            
            const webhookPayload = {
              event: 'bill.paid',
              houseTabzAgreementId: houseService.houseTabzAgreementId,
              externalAgreementId: houseService.externalAgreementId || null,
              externalBillId: this.metadata.externalBillId,
              amountPaid: parseFloat(this.baseAmount),
              paymentDate: new Date().toISOString()
            };
            
            // Log the payload
            console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));
            
            // Send the webhook
            try {
              const response = await axios.post(TEST_WEBHOOK_URL, webhookPayload);
              console.log(`Webhook sent successfully. Status: ${response.status}`);
              
              // Log the webhook delivery
              if (sequelize.models.WebhookLog) {
                await sequelize.models.WebhookLog.create({
                  partner_id: houseService.partnerId,
                  event_type: 'bill.paid',
                  payload: webhookPayload,
                  status: 'success',
                  status_code: response.status,
                  response: response.data || {}
                });
              }
            } catch (webhookError) {
              console.error('Error sending webhook:', webhookError);
              
              // Log the webhook failure
              if (sequelize.models.WebhookLog) {
                await sequelize.models.WebhookLog.create({
                  partner_id: houseService.partnerId,
                  event_type: 'bill.paid',
                  payload: webhookPayload,
                  status: 'failed',
                  error: webhookError.message
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing bill.paid webhook:', error);
        }
      };
      
      // If we're in a transaction, execute after commit
      if (transaction) {
        transaction.afterCommit(afterCommitAction);
      } else {
        // Otherwise execute immediately
        await afterCommitAction();
      }
    }
  };

  return Bill;
};

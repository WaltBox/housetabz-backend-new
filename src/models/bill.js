const webhookService = require('../services/webhookService'); // 🔥 ADD THIS LINE

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

    // ✅ Rename the alias to match method below
    Bill.belongsTo(models.HouseService, { 
      foreignKey: 'houseService_id',
      as: 'houseServiceModel',
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

  // ✅ Instance method to access HouseService (used in Charge)
  Bill.prototype.getHouseService = async function (transaction = null) {
    return await this.getHouseServiceModel({ transaction });
  };

  // 🔥 UPDATED: Instance method to update status based on related charges
  Bill.prototype.updateStatus = async function (transaction = null) {
    const charges = await sequelize.models.Charge.findAll({
      where: { billId: this.id },
      transaction
    });

    const allPaid = charges.every(charge => charge.status === 'paid');
    const anyPaid = charges.some(charge => charge.status === 'paid');

    const previousStatus = this.status;
    this.status = allPaid ? 'paid' : anyPaid ? 'partial_paid' : 'pending';
    await this.save({ transaction });

    // 🔥 NEW CLEAN WEBHOOK LOGIC
    if (previousStatus !== 'paid' && this.status === 'paid') {
      const afterCommitAction = async () => {
        try {
          const houseService = await sequelize.models.HouseService.findByPk(this.houseService_id);

          if (
            houseService &&
            houseService.partnerId &&
            houseService.billingSource === 'partner' &&
            this.metadata?.externalBillId
          ) {
            console.log(`Sending bill.paid webhook for billId: ${this.id}, externalBillId: ${this.metadata.externalBillId}`);

            // 🚀 USE THE NEW WEBHOOK SERVICE WITH SIGNATURES!
            const result = await webhookService.sendWebhook(
              houseService.partnerId,
              'bill.paid',
              {
                houseTabzAgreementId: houseService.houseTabzAgreementId,
                externalAgreementId: houseService.externalAgreementId || null,
                externalBillId: this.metadata.externalBillId,
                amountPaid: parseFloat(this.baseAmount),
                paymentDate: new Date().toISOString()
              }
            );

            if (result.success) {
              console.log('Bill.paid webhook sent successfully');
            } else {
              console.error('Bill.paid webhook failed:', result.error || result.reason);
            }
          }
        } catch (error) {
          console.error('Error processing bill.paid webhook:', error);
        }
      };

      if (transaction) {
        transaction.afterCommit(afterCommitAction);
      } else {
        await afterCommitAction();
      }
    }
  };

  return Bill;
};
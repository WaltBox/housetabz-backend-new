const webhookService = require('../services/webhookService');

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
    },
    providerPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indicates if HouseTabz has paid the provider'
    },
    providerPaidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when HouseTabz paid the service provider'
    },
    frontedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Amount fronted by HouseTabz on behalf of the house'
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

  // Legacy method - kept for backwards compatibility
  Bill.prototype.finalizePayment = async function (transaction = null) {
    const charges = await sequelize.models.Charge.findAll({
      where: { billId: this.id },
      transaction
    });
  
    const paidTotal = charges
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
  
    const frontedAmount = Math.max(0, parseFloat(this.amount) - paidTotal);
  
    this.frontedAmount = frontedAmount;
    this.providerPaid = true;
    this.providerPaidAt = new Date();
  
    if (frontedAmount > 0) {
      const unpaidUsers = charges
        .filter(c => c.status !== 'paid')
        .map(c => c.userId);
  
      this.metadata = {
        ...this.metadata,
        frontedBy: unpaidUsers
      };
    }
  
    await this.save({ transaction });
  };
  
  // Instance method to access HouseService (used in Charge)
  Bill.prototype.getHouseService = async function (transaction = null) {
    return await this.getHouseServiceModel({ transaction });
  };

  // Instance method to update status based on related charges
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

    // Webhook logic for when bill becomes fully paid
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

  /**
   * Process provider payment - handles advancement logic and marks bill as provider paid
   * This is the core method that implements the advancement flow
   * @param {object} transaction - Sequelize transaction
   * @returns {Promise<object>} { advancedAmount, chargesAdvanced, totalAmount }
   */
  Bill.prototype.processProviderPayment = async function(transaction = null) {
    const t = transaction || await sequelize.transaction();
    const shouldCommit = !transaction;
    const { canAdvanceCharge } = require('../services/advanceService');

    try {
      // 1. Check if already processed
      if (this.providerPaid) {
        throw new Error(`Bill ${this.id} is already marked as provider paid`);
      }

      // 2. Get all charges for this bill
      const charges = await sequelize.models.Charge.findAll({
        where: { billId: this.id },
        transaction: t
      });

      if (!charges || charges.length === 0) {
        throw new Error(`No charges found for bill ${this.id}`);
      }

      // 3. Calculate funding status
      const unpaidCharges = charges.filter(charge => charge.status === 'unpaid');
      const paidCharges = charges.filter(charge => charge.status === 'paid');
      
      const unpaidAmount = unpaidCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
      const paidAmount = paidCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
      const totalBillAmount = parseFloat(this.amount);

      console.log(`[processProviderPayment] Bill ${this.id} analysis:`);
      console.log(`  - Total bill amount: $${totalBillAmount}`);
      console.log(`  - Amount paid by users: $${paidAmount}`);
      console.log(`  - Amount unpaid: $${unpaidAmount}`);
      console.log(`  - Unpaid charges: ${unpaidCharges.length}`);

      let advancedAmount = 0;
      let chargesAdvanced = [];

      // 4. If there are unpaid charges, check if we can advance them
      if (unpaidAmount > 0) {
        console.log(`[processProviderPayment] Checking if house ${this.houseId} can advance $${unpaidAmount}`);
        
        const advanceCheck = await canAdvanceCharge(this.houseId, unpaidAmount);
        
        console.log(`[processProviderPayment] Advance check result:`, {
          allowed: advanceCheck.allowed,
          houseAllowance: advanceCheck.allowance,
          remaining: advanceCheck.remaining
        });

        if (advanceCheck.allowed) {
          // 5. We can advance! Mark each unpaid charge as advanced
          console.log(`[processProviderPayment] Advancing ${unpaidCharges.length} unpaid charges`);
          
          for (const charge of unpaidCharges) {
            try {
              await charge.markAsAdvanced(t);
              chargesAdvanced.push({
                id: charge.id,
                amount: charge.amount,
                userId: charge.userId
              });
              console.log(`  ✓ Advanced charge ${charge.id} for user ${charge.userId}: $${charge.amount}`);
            } catch (error) {
              console.error(`  ✗ Failed to advance charge ${charge.id}:`, error.message);
              throw new Error(`Failed to advance charge ${charge.id}: ${error.message}`);
            }
          }
          
          advancedAmount = unpaidAmount;
          console.log(`[processProviderPayment] Successfully advanced total: $${advancedAmount}`);
          
        } else {
          // 6. Cannot advance - insufficient allowance
          const shortfall = unpaidAmount - advanceCheck.remaining;
          throw new Error(
            `Cannot advance $${unpaidAmount} for house ${this.houseId}. ` +
            `House allowance: $${advanceCheck.allowance}, ` +
            `remaining: $${advanceCheck.remaining}, ` +
            `shortfall: $${shortfall.toFixed(2)}`
          );
        }
      } else {
        console.log(`[processProviderPayment] No advancement needed - all charges are paid`);
      }

      // 7. Update bill to mark as provider paid
      this.providerPaid = true;
      this.providerPaidAt = new Date();
      this.frontedAmount = advancedAmount; // Track how much we advanced
      
      // Update metadata with advancement info
      this.metadata = {
        ...this.metadata,
        providerPaymentProcessed: new Date().toISOString(),
        advancedAmount: advancedAmount,
        chargesAdvanced: chargesAdvanced.length,
        fullyFunded: unpaidAmount === 0
      };
      
      await this.save({ transaction: t });

      // 8. Update bill status based on all charges
      await this.updateStatus(t);

      console.log(`[processProviderPayment] Bill ${this.id} successfully processed as provider paid`);

      if (shouldCommit) {
        await t.commit();
      }

      // 9. Return summary of what happened
      return {
        success: true,
        totalBillAmount: totalBillAmount,
        paidByUsers: paidAmount,
        advancedByHouseTabz: advancedAmount,
        chargesAdvanced: chargesAdvanced,
        fullyFunded: unpaidAmount === 0,
        message: unpaidAmount > 0 
          ? `Advanced $${advancedAmount} for ${chargesAdvanced.length} charges`
          : 'No advancement needed - bill fully funded by users'
      };

    } catch (error) {
      if (shouldCommit) {
        await t.rollback();
      }
      console.error(`[processProviderPayment] Failed for bill ${this.id}:`, error.message);
      throw error;
    }
  };

  return Bill;
};
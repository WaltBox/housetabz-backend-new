// models/Charge.js

module.exports = (sequelize, DataTypes) => {
  const Charge = sequelize.define('Charge', {
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unpaid',
      validate: {
        isIn: [['unpaid', 'processing', 'paid', 'failed']]
      }
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentMethodId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    serviceFee: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    hsiAtTimeOfCharge: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pointsPotential: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2
    },
    // NEW ADVANCE FIELDS
    advanced: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,

    },
    advancedAt: {
      type: DataTypes.DATE,
      allowNull: true,
   
    },
    repaidAt: {
      type: DataTypes.DATE,
      allowNull: true,

    }
  }, {
    indexes: [
      { fields: ['status'] },
      { fields: ['stripePaymentIntentId'] },
      { fields: ['userId'] },
      { fields: ['billId'] },
      { fields: ['advanced'] },
      { fields: ['advancedAt'] },
      { fields: ['advanced', 'status'] } // ← Composite index for common queries
    ]
  });

  Charge.associate = (models) => {
    Charge.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'User',
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION'
    });

    Charge.belongsTo(models.Bill, {
      foreignKey: 'billId',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  };

  // EXISTING processPayment method with advance logic added
  Charge.prototype.processPayment = async function (stripeService) {
    const transaction = await sequelize.transaction();
    const logPrefix = `CHARGE ${this.id}`;

    try {
      // Set status to processing
      this.status = 'processing';
      await this.save({ transaction });

      // Call Stripe
      const paymentIntent = await stripeService.processPayment(this);

      // Update charge to paid
      this.stripePaymentIntentId = paymentIntent.id;
      this.status = 'paid';
      
      // If this was an advanced charge, mark when it was repaid
      if (this.advanced) {
        this.repaidAt = new Date();
        console.log(`[ADVANCE REPAYMENT] Charge ${this.id} repaid by user ${this.userId}`);
      }
      
      this.metadata = {
        ...this.metadata,
        paidDate: new Date().toISOString(),
        wasAdvanced: this.advanced // Store for historical reference
      };
      await this.save({ transaction });

      // If this was an advanced charge, create a repayment transaction
      if (this.advanced) {
        const bill = await this.getBill({ transaction });
        await sequelize.models.Transaction.create({
          houseId: bill.houseId,
          chargeId: this.id,
          userId: this.userId,
          type: 'ADVANCE_REPAYMENT',
          amount: this.amount,
          description: `User ${this.userId} repaid advanced charge ${this.id}`,
          balanceBefore: 0, // Will be calculated if needed
          balanceAfter: 0,  // Will be calculated if needed
          metadata: {
            originalAdvanceDate: this.advancedAt,
            repaymentDate: new Date().toISOString()
          }
        }, { transaction });
        console.log(`[ADVANCE REPAYMENT] Created repayment transaction for charge ${this.id}`);
      }

      // Continue with existing logic...
      const bill = await this.getBill({ transaction });
      if (!bill) throw new Error(`No bill found for charge ${this.id}`);

      const houseService = await bill.getHouseService({ transaction });
      if (!houseService) throw new Error(`No houseService found for bill ${bill.id}`);

      const ledger = await houseService.getActiveLedger({ transaction });
      if (!ledger) throw new Error(`No active ledger found for houseService ${houseService.id}`);

      // Fund ledger
      await ledger.increment('funded', {
        by: Number(this.amount),
        transaction
      });

      // Track user contribution in metadata
      await ledger.addContribution(this.userId, this.amount, this.id, transaction);

      // Update bill status
      await bill.updateStatus(transaction);

      await transaction.commit();
      console.log(`✅ ${logPrefix}: Payment processed successfully${this.advanced ? ' (was advanced)' : ''}`);
      return true;
    } catch (error) {
      await transaction.rollback();

      const errorMsg = (error.message || 'Unknown error').slice(0, 1000);
      this.status = 'failed';
      this.errorMessage = errorMsg;
      this.retryCount += 1;
      await this.save();

      console.error(`❌ ${logPrefix}: failed with error ->`, error);
      throw error;
    }
  };

  // NEW METHOD: Mark charge as advanced (called when HouseTabz advances payment)
  Charge.prototype.markAsAdvanced = async function (dbTransaction = null) {
    const transaction = dbTransaction || await sequelize.transaction();
    const shouldCommit = !dbTransaction;

    try {
      if (this.status !== 'unpaid') {
        throw new Error(`Cannot advance charge ${this.id}. Current status: ${this.status}`);
      }

      if (this.advanced) {
        throw new Error(`Charge ${this.id} is already marked as advanced`);
      }

      // Get the bill for house info
      const bill = await this.getBill({ transaction });
      if (!bill) throw new Error(`No bill found for charge ${this.id}`);

      // Create ADVANCE transaction
      await sequelize.models.Transaction.create({
        houseId: bill.houseId,
        chargeId: this.id,
        type: 'ADVANCE',
        amount: this.amount,
        description: `HouseTabz advanced payment for charge ${this.id}`,
        balanceBefore: 0, // Will be calculated if needed
        balanceAfter: 0,  // Will be calculated if needed
        metadata: {
          originalDueDate: this.dueDate,
          advanceDate: new Date().toISOString(),
          billId: bill.id,
          userId: this.userId
        }
      }, { transaction });

      // Mark charge as advanced (but keep status as 'unpaid')
      this.advanced = true;
      this.advancedAt = new Date();
      this.metadata = {
        ...this.metadata,
        advancedDate: new Date().toISOString(),
        originalStatus: 'unpaid'
      };
      await this.save({ transaction });

      console.log(`[ADVANCE] Charge ${this.id} marked as advanced for user ${this.userId}: $${this.amount}`);

      if (shouldCommit) {
        await transaction.commit();
        
        // Send notifications to all house members AFTER transaction commits
        await this.sendAdvanceNotifications(bill.houseId);
      }

      return true;
    } catch (error) {
      if (shouldCommit) {
        await transaction.rollback();
      }
      throw error;
    }
  };

  // Helper method to send advance notifications to all house members
  Charge.prototype.sendAdvanceNotifications = async function (houseId) {
    try {
      // Get all users in the house
      const users = await sequelize.models.User.findAll({ 
        where: { houseId },
        attributes: ['id', 'username', 'email']
      });

      // Get current advance allowance remaining
      const advanceService = require('../services/advanceService');
      const advanceCheck = await advanceService.canAdvanceCharge(houseId, 0); // Check with 0 to get current remaining
      const remainingAdvance = advanceCheck.remaining || 0;

      // Format the notification message
      const message = `HouseTabz had to advance '${this.name}' for $${parseFloat(this.amount).toFixed(2)}. Your house now has $${remainingAdvance.toFixed(2)} remaining. See who missed their payment and remind them to pay.`;

      // Send notification to each house member
      for (const user of users) {
        try {
          // Create database notification
          await sequelize.models.Notification.create({
            userId: user.id,
            message: message,
            isRead: false,
            metadata: {
              type: 'charge_advanced',
              chargeId: this.id,
              houseId: houseId,
              advancedAmount: this.amount,
              remainingAdvance: remainingAdvance,
              chargeName: this.name
            }
          });

          // Send push notification
          const pushNotificationService = require('../services/pushNotificationService');
          await pushNotificationService.sendPushNotification(user, {
            title: 'HouseTabz Advanced Payment',
            message: message,
            data: {
              type: 'charge_advanced',
              chargeId: this.id,
              houseId: houseId,
              advancedAmount: this.amount,
              remainingAdvance: remainingAdvance
            }
          });

          console.log(`📢 Sent advance notification to ${user.username} about charge ${this.id}`);
        } catch (notificationError) {
          console.error(`Error sending advance notification to user ${user.id}:`, notificationError);
        }
      }

      console.log(`✅ Sent advance notifications to ${users.length} users in house ${houseId}`);
    } catch (error) {
      console.error(`Error sending advance notifications for charge ${this.id}:`, error);
    }
  };

  // Helper method to check if charge is eligible for advancement
  Charge.prototype.canBeAdvanced = function() {
    return this.status === 'unpaid' && !this.advanced;
  };

  // Helper method to check if charge was advanced and is now repaid
  Charge.prototype.wasAdvancedAndRepaid = function() {
    return this.status === 'paid' && this.advanced && this.repaidAt;
  };

  return Charge;
};
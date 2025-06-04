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
    }
  }, {
    indexes: [
      { fields: ['status'] },
      { fields: ['stripePaymentIntentId'] },
      { fields: ['userId'] },
      { fields: ['billId'] }
    ]
  });

  Charge.associate = (models) => {
    Charge.belongsTo(models.User, {
      foreignKey: 'userId',
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION'
    });

    Charge.belongsTo(models.Bill, {
      foreignKey: 'billId',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  };

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
      this.metadata = {
        ...this.metadata,
        paidDate: new Date().toISOString()
      };
      await this.save({ transaction });
    

      // Load bill and house service
      const bill = await this.getBill({ transaction });
      if (!bill) throw new Error(`No bill found for charge ${this.id}`);

      // Fix: Pass transaction as an object parameter
      const houseService = await bill.getHouseService({ transaction });
      if (!houseService) throw new Error(`No houseService found for bill ${bill.id}`);

      // Fix: Pass transaction as an object parameter
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

  return Charge;
};
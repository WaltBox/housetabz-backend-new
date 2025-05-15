// Updated Charge model with simplified status
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
      allowNull: false,
      comment: 'User portion of the bill before fees'
    },
    serviceFee: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'HSI-adjusted service fee'
    },
    hsiAtTimeOfCharge: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'House HSI at time of charge creation'
    },
    pointsPotential: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Potential points for on-time payment'
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

  // Updated instance method with 'unpaid' status
  Charge.prototype.processPayment = async function(stripeService) {
    try {
      this.status = 'processing';
      await this.save();

      const paymentIntent = await stripeService.processPayment(this);
      
      this.stripePaymentIntentId = paymentIntent.id;
      this.status = 'paid';
      await this.save();

      const bill = await this.getBill();
if (bill) {
  const houseService = await bill.getHouseService();
  if (houseService) {
    const ledger = await houseService.getActiveLedger();
    if (ledger) {
      await ledger.increment('funded', { by: Number(this.amount) });
    }
  }
}


      // Update bill status
      await this.getBill().then(bill => bill.updateStatus());

      return true;
    } catch (error) {
      const errorMsg = error.message && error.message.length > 1000 
        ? error.message.substring(0, 1000) 
        : error.message;
      
      this.status = 'failed';
      this.errorMessage = errorMsg;
      this.retryCount += 1;
      await this.save();
      
      throw error;
    }
  };

  return Charge;
};
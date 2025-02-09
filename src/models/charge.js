// src/models/Charge.js
module.exports = (sequelize, DataTypes) => {
  const Charge = sequelize.define('Charge', {
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,  // Changed from ENUM to STRING
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'processing', 'paid', 'failed']]  // Validation moved here
      }
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    paymentMethodId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.STRING,
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

  // Instance methods remain the same
  Charge.prototype.processPayment = async function(stripeService) {
    try {
      this.status = 'processing';
      await this.save();

      const paymentIntent = await stripeService.processPayment(this);
      
      this.stripePaymentIntentId = paymentIntent.id;
      this.status = 'paid';
      await this.save();

      // Update bill status
      await this.getBill().then(bill => bill.updateStatus());

      return true;
    } catch (error) {
      this.status = 'failed';
      this.errorMessage = error.message;
      this.retryCount += 1;
      await this.save();
      
      throw error;
    }
  };

  return Charge;
};
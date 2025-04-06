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
      transaction // 👈 THIS is the missing piece
    });
  
    const allPaid = charges.every(charge => charge.status === 'paid');
    const anyPaid = charges.some(charge => charge.status === 'paid');
  
    if (allPaid) {
      this.status = 'paid';
    } else if (anyPaid) {
      this.status = 'partial_paid';
    } else {
      this.status = 'pending';
    }
  
    await this.save({ transaction });
  };
  

  return Bill;
};

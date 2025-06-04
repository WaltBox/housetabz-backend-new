// models/HouseServiceLedger.js

module.exports = (sequelize, DataTypes) => {
  const HouseServiceLedger = sequelize.define('HouseServiceLedger', {
    houseServiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'HouseServices', key: 'id' },
      onDelete: 'CASCADE'
    },
    billId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Bills', key: 'id' },
      onDelete: 'SET NULL'
    },
    fundingRequired: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    funded: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    amountFronted: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    cycleStart: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    cycleEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      defaultValue: 'active'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'HouseServiceLedgers'
  });

  HouseServiceLedger.associate = (models) => {
    HouseServiceLedger.belongsTo(models.HouseService, {
      foreignKey: 'houseServiceId',
      as: 'houseService'
    });

    HouseServiceLedger.belongsTo(models.Bill, {
      foreignKey: 'billId',
      as: 'bill'
    });
  };

  /**
   * Add a user's contribution to the ledger
   * Updates both the funded amount and metadata.fundedUsers[]
   */
  HouseServiceLedger.prototype.addContribution = async function(userId, amount, chargeId = null, transaction = null, skipFundedIncrement = false) {
    try {

  
      const metadata = this.metadata || {};
      const fundedUsers = metadata.fundedUsers || [];
  
      const userIndex = fundedUsers.findIndex(u => u.userId === userId);
  
      if (userIndex >= 0) {
        fundedUsers[userIndex].amount += Number(amount);
        fundedUsers[userIndex].lastUpdated = new Date().toISOString();
  
        if (chargeId && !fundedUsers[userIndex].charges?.includes(chargeId)) {
          fundedUsers[userIndex].charges = fundedUsers[userIndex].charges || [];
          fundedUsers[userIndex].charges.push(chargeId);
        }
      } else {
        fundedUsers.push({
          userId,
          amount: Number(amount),
          charges: chargeId ? [chargeId] : [],
          timestamp: new Date().toISOString()
        });
      }
  
      // Update metadata and funded amount
      this.metadata = {
        ...metadata,
        fundedUsers,
        lastUpdated: new Date().toISOString()
      };
  
      // Only update funded amount if not skipped
      if (!skipFundedIncrement) {
        this.funded = Number(this.funded) + Number(amount);
      }
  
      await this.save({ transaction });
  
      
      return true;
    } catch (error) {
      console.error(`Error adding contribution to ledger ${this.id}:`, error);
      throw error;
    }
  };

  return HouseServiceLedger;
};

module.exports = (sequelize, DataTypes) => {
  const HouseService = sequelize.define('HouseService', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    houseTabzAgreementId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      comment: 'HouseTabz UUID shared with partners (agreement reference)'
    },
    
    externalAgreementId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Partners internal ID for the agreement/account'
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    type: {
      type: DataTypes.ENUM('fixed_recurring', 'variable_recurring', 'one_time'),
      allowNull: false,
      defaultValue: 'fixed_recurring'
    },

    billingSource: {
      type: DataTypes.ENUM('housetabz', 'partner'),
      allowNull: false,
      defaultValue: 'housetabz'
    },

    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'  // Re-added the default value
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    createDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 31 }
    },

    dueDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 31 }
    },

    reminderDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 31 }
    },

    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },

    feeCategory: {
      type: DataTypes.ENUM('card', 'marketplace'),
      allowNull: false,
      defaultValue: 'marketplace'
    },

    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Houses', key: 'id' }
    },

    partnerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Partners', key: 'id' }
    },

    designatedUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },

    serviceRequestBundleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'ServiceRequestBundles', key: 'id' }
    },

    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'HouseServices'  // Explicitly specify the table name to match what's in the database
  });

  HouseService.associate = (models) => {
    HouseService.belongsTo(models.House, {
      foreignKey: 'houseId',
      onDelete: 'CASCADE'
    });

    HouseService.belongsTo(models.User, {
      foreignKey: 'designatedUserId',
      as: 'designatedUser'
    });

    HouseService.belongsTo(models.Partner, {
      foreignKey: 'partnerId',
      as: 'partner'
    });

    HouseService.belongsTo(models.ServiceRequestBundle, {
      foreignKey: 'serviceRequestBundleId',
      as: 'serviceRequestBundle'
    });

    HouseService.hasMany(models.Bill, {
      foreignKey: 'houseService_id',
      as: 'bills'
    });
    HouseService.hasMany(models.HouseServiceLedger, {
      foreignKey: 'houseServiceId',
      as: 'ledgers'
    });
  };

  HouseService.prototype.getActiveLedger = async function () {
    return await sequelize.models.HouseServiceLedger.findOne({
      where: {
        houseServiceId: this.id,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });
  };
  

  return HouseService;
};
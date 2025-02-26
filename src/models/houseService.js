// src/models/HouseService.js
module.exports = (sequelize, DataTypes) => {
  const HouseService = sequelize.define('HouseService', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'pending']]
      }
    },
    // Fields for enhanced functionality
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'fixed_recurring',
      validate: {
        isIn: [['fixed_recurring', 'variable_recurring', 'marketplace_onetime']]
      }
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monthly amount for fixed recurring services',
      get() {
        const value = this.getDataValue('amount');
        return value === null ? null : Number(value);
      },
      set(value) {
        if (value !== null) {
          this.setDataValue('amount', Number(value).toFixed(2));
        }
      }
    },
    dueDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Day of month when bill is due'
    },
    createDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Day of month when bill should be created (for fixed_recurring)'
    },
    reminderDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Day of month when to remind users to enter variable bill amounts (for variable_recurring)'
    },
    designatedUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User responsible for entering variable bill amounts'
    },
    serviceRequestBundleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ServiceRequestBundles',
        key: 'id'
      },
      comment: 'Reference to the original request that created this service'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional service-specific details'
    }
  });

  HouseService.associate = (models) => {
    HouseService.belongsTo(models.House, {
      foreignKey: 'houseId',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    HouseService.hasMany(models.Bill, {
      foreignKey: 'houseService_id',
      as: 'bills'
    });
    // Associations
    HouseService.belongsTo(models.User, {
      foreignKey: 'designatedUserId',
      as: 'designatedUser'
    });
    HouseService.belongsTo(models.ServiceRequestBundle, {
      foreignKey: 'serviceRequestBundleId',
      as: 'serviceRequestBundle'
    });
  };

  return HouseService;
};
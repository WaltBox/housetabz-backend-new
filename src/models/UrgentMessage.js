// src/models/urgentMessage.js
module.exports = (sequelize, DataTypes) => {
    const UrgentMessage = sequelize.define(
      'UrgentMessage',
      {
        houseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'house_id'
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id'
        },
        billId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'bill_id'
        },
        chargeId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'charge_id'
        },
        type: {
          type: DataTypes.STRING(32),
          allowNull: false
        },
        title: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        body: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        isRead: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_read'
        },
        metadata: {
            type: DataTypes.JSONB, // or DataTypes.TEXT if not using PostgreSQL
            allowNull: true,
            field: 'metadata'
          },
          isResolved: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_resolved'
          }
      },
      {
        tableName: 'UrgentMessages',
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ['charge_id', 'user_id', 'type'],
            name: 'urgent_messages_unique_charge_user_type'
          }
        ]
      }
    );
  
    UrgentMessage.associate = (models) => {
      UrgentMessage.belongsTo(models.House, { foreignKey: 'house_id', as: 'house' });
      UrgentMessage.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
      UrgentMessage.belongsTo(models.Bill, { foreignKey: 'bill_id', as: 'bill' });
      UrgentMessage.belongsTo(models.Charge, { foreignKey: 'charge_id', as: 'charge' });
    };
  
    return UrgentMessage;
  };
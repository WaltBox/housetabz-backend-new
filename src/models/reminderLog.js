// src/models/reminderLog.js
module.exports = (sequelize, DataTypes) => {
    const ReminderLog = sequelize.define(
      'ReminderLog',
      {
        senderId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'sender_id'
        },
        recipientId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'recipient_id'
        },
        billId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'bill_id'
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false
        }
      },
      {
        tableName: 'ReminderLogs',
        freezeTableName: true,
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          {
            fields: ['sender_id', 'recipient_id', 'created_at'],
            name: 'reminder_logs_sender_recipient_created_idx'
          }
        ]
      }
    );
  
    ReminderLog.associate = (models) => {
      ReminderLog.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
      ReminderLog.belongsTo(models.User, { foreignKey: 'recipient_id', as: 'recipient' });
      ReminderLog.belongsTo(models.Bill, { foreignKey: 'bill_id', as: 'bill' });
    };
  
    return ReminderLog;
  };
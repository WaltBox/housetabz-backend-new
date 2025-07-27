module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'general'
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // Notifications are unread by default
      },
    });
  
    Notification.associate = (models) => {
      Notification.belongsTo(models.User, { foreignKey: 'userId' });
    };
  
    return Notification;
  };
  
  
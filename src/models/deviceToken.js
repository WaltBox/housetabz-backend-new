// models/deviceToken.js
module.exports = (sequelize, DataTypes) => {
    const DeviceToken = sequelize.define('DeviceToken', {
      id: {
        // Use INTEGER if your Users.id is INTEGER, or keep UUID if Users.id is UUID
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        // Match this to your Users model - INTEGER or UUID
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      deviceType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [['ios', 'android']]
        }
      },
      endpointArn: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      tableName: 'device_tokens',
      timestamps: true
    });
  
    DeviceToken.associate = models => {
      DeviceToken.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    };
  
    return DeviceToken;
  };
// src/models/UserFeedback.js
module.exports = (sequelize, DataTypes) => {
    const UserFeedback = sequelize.define('UserFeedback', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
      },
      // If you wish to enforce specific categories, you can use ENUM.
      // Otherwise, you can simply use DataTypes.STRING.
      category: {
        type: DataTypes.ENUM('bug', 'suggestion', 'praise', 'general'),
        allowNull: false,
        defaultValue: 'general'
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      }
    }, {
      tableName: 'UserFeedbacks',
      timestamps: true, // Automatically adds createdAt and updatedAt
    });
  
    UserFeedback.associate = (models) => {
      // Optionally associate feedback with the User model
      UserFeedback.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    };
  
    return UserFeedback;
  };
  
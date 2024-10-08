// src/models/user.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    auth0Id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });

  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  });

  User.prototype.comparePassword = function (candidatePassword) {
    if (this.password) {
      return bcrypt.compare(candidatePassword, this.password);
    }
    return false;
  };


  User.associate = (models) => {
    User.belongsTo(models.House, { foreignKey: 'houseId', as: 'house' }); // Associate User with House
  };

  return User;
};

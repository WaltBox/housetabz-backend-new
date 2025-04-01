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
    }
    // Financial fields have been removed and moved to UserFinance model
  });

  // Password hashing hooks remain the same
  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  });

  User.prototype.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  };

  User.associate = (models) => {
    User.hasMany(models.Charge, { foreignKey: 'userId', as: 'charges' });
    User.belongsTo(models.House, { foreignKey: 'houseId', as: 'house' });
    User.hasMany(models.Task, { foreignKey: 'userId', as: 'tasks' });
    User.hasOne(models.StripeCustomer, { foreignKey: 'userId', as: 'stripeCustomer' });
    
    // New association to UserFinance
    User.hasOne(models.UserFinance, { foreignKey: 'userId', as: 'finance' });
    // New association to Transaction
    User.hasMany(models.Transaction, { foreignKey: 'userId', as: 'transactions' });
  };

  return User;
};
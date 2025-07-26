// src/models/user.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // Your existing model definition
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
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true, // Keep as optional in DB for existing users
      validate: {
        customValidator(value) {
          // For new registrations, phone number is required
          if (this.isNewRecord && (!value || value.trim() === '')) {
            throw new Error("Phone number is required");
          }
          
          // Very basic validation - just check it's not empty or too short/long
          if (value && value.trim()) {
            const trimmedValue = value.trim();
            
            // Just check reasonable length - be very permissive
            if (trimmedValue.length < 7 || trimmedValue.length > 17) {
              throw new Error("Phone number must be between 7 and 17 characters");
            }
          }
        }
      }
    },
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resetCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetCodeExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    onboarded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    onboarding_step: {
      type: DataTypes.ENUM('house', 'payment', 'completed'),
      allowNull: false,
      defaultValue: 'house'
    },
    onboarded_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  // Password hashing for new users
  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  });

  // Add this hook for password updates
  User.beforeUpdate(async (user) => {
    if (user.changed('password') && user.password) {
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

  // Check if user has completed onboarding
  User.prototype.isOnboarded = function() {
    return this.onboarded === true;
  };

  // Advance onboarding step if conditions are met
  User.prototype.advanceOnboardingStep = async function(transaction = null) {
    if (this.onboarded) {
      return this; // Already onboarded, nothing to do
    }

    const { House, PaymentMethod, StripeCustomer } = require('../models');
    
    try {
      // Check if user has a house
      const hasHouse = this.houseId !== null;
      
      // Check if user has an active payment method
      let hasPaymentMethod = false;
      if (hasHouse) {
        const paymentMethod = await PaymentMethod.findOne({
          where: { userId: this.id },
          transaction
        });
        hasPaymentMethod = !!paymentMethod;
      }

      // Determine new onboarding step
      let newStep = this.onboarding_step;
      let shouldComplete = false;

      if (this.onboarding_step === 'house' && hasHouse) {
        newStep = 'payment';
      }
      
      if (this.onboarding_step === 'payment' && hasHouse && hasPaymentMethod) {
        newStep = 'completed';
        shouldComplete = true;
      }

      // If advancing from house step directly to completed (user has both house and payment method)
      if (this.onboarding_step === 'house' && hasHouse && hasPaymentMethod) {
        newStep = 'completed';
        shouldComplete = true;
      }

      // Update the user if there's a change
      if (newStep !== this.onboarding_step || shouldComplete) {
        const updateData = {
          onboarding_step: newStep
        };

        if (shouldComplete) {
          updateData.onboarded = true;
          updateData.onboarded_at = new Date();
        }

        await this.update(updateData, { transaction });
      }

      return this;
    } catch (error) {
      console.error('Error advancing onboarding step:', error);
      throw error;
    }
  };

  User.associate = (models) => {
    // Your existing associations
    User.hasMany(models.Charge, { foreignKey: 'userId', as: 'charges' });
    User.belongsTo(models.House, { foreignKey: 'houseId', as: 'house' });
    User.hasMany(models.Task, { foreignKey: 'userId', as: 'tasks' });
    User.hasOne(models.StripeCustomer, { foreignKey: 'userId', as: 'stripeCustomer' });
    
    User.hasOne(models.UserFinance, { foreignKey: 'userId', as: 'finance' });
    User.hasMany(models.Transaction, { foreignKey: 'userId', as: 'transactions' });
    
    // Add UrgentMessage association
    User.hasMany(models.UrgentMessage, { foreignKey: 'user_id', as: 'urgentMessages' });
  };

  return User;
};
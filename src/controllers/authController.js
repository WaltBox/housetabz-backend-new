// src/controllers/authController.js
const { User, House } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // Import Sequelize operators
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth/tokenUtils');
const { sendPasswordResetCode } = require('../services/emailService');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ 
        where: { email },
        include: [{
          model: House,
          as: 'house',
          required: false
        }]
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate both tokens
      const token = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // the response structure
      const response = {
        success: true,
        token,
        refreshToken,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            phoneNumber: user.phoneNumber,
            houseId: user.houseId,
            house: user.house,
            balance: user.balance,
            points: user.points,
            credit: user.credit
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  },

  // FIXED: Changed from arrow function to regular function
  async verifyCredentials(req, res) {
    try {
      const { email, password } = req.body;
  
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
  
      // Find user by email
      const user = await User.findOne({ 
        where: { email },
        include: [
          {
            model: House,
            as: 'house',
            attributes: ['id', 'name', 'city', 'state', 'zip_code', 'house_code', 'creator_id'],
            required: false
          }
        ]
      });
  
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
  
      // FIXED: Use comparePassword method (same as login)
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
  
      // Return user data without creating a session/token
      res.json({
        success: true,
        message: 'Credentials verified',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          houseId: user.houseId,
          house: user.house
        }
      });
  
    } catch (error) {
      console.error('Error verifying credentials:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during credential verification'
      });
    }
  },

  async register(req, res) {
    try {
      const { username, email, password, phoneNumber } = req.body;

      // Input validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      // Phone number validation and formatting
      if (!phoneNumber || phoneNumber.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Clean phone number - remove all non-digit characters except +
      let cleanedPhone = phoneNumber.replace(/[^\d+]/g, '');
      
      // Handle different input formats intelligently
      if (!cleanedPhone.startsWith('+')) {
        // Remove leading 1 if present (US country code without +)
        if (cleanedPhone.startsWith('1') && cleanedPhone.length === 11) {
          cleanedPhone = cleanedPhone.substring(1);
        }
        
        // If we have 10 digits, assume it's a US number
        if (cleanedPhone.length === 10) {
          cleanedPhone = '+1' + cleanedPhone;
        }
        // If we have 7-9 digits, assume US number with area code missing or partial
        else if (cleanedPhone.length >= 7 && cleanedPhone.length <= 9) {
          // For now, we'll assume it's a US number and pad or handle as needed
          // This is very permissive - you might want to adjust based on your user base
          if (cleanedPhone.length === 7) {
            // Assume local number, add common area code (you could make this smarter)
            cleanedPhone = '+1415' + cleanedPhone; // 415 is just an example
          } else if (cleanedPhone.length === 8) {
            cleanedPhone = '+141' + cleanedPhone;
          } else if (cleanedPhone.length === 9) {
            cleanedPhone = '+14' + cleanedPhone;
          }
        }
        // If we have 11+ digits, assume it already includes country code
        else if (cleanedPhone.length >= 11) {
          cleanedPhone = '+' + cleanedPhone;
        }
        // If less than 7 digits, it's probably incomplete
        else {
          return res.status(400).json({
            success: false,
            message: 'Please enter a complete phone number'
          });
        }
      }

      // Very basic final validation - just check it's not too long
      if (cleanedPhone.length > 16 || cleanedPhone.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid phone number'
        });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check existing user using the imported Op operator
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Create user (password hashing is handled by model hooks)
      const user = await User.create({
        username,
        email,
        password,
        phoneNumber: cleanedPhone // Use the cleaned and formatted phone number
      });

      // Generate both tokens
      const token = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            phoneNumber: user.phoneNumber
          },
          token,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ 
          success: false,
          message: 'Refresh token is required' 
        });
      }
      
      // Verify the refresh token
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid or expired refresh token' 
        });
      }
      
      // Get user to include in response
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      // Generate a new access token (and optionally a new refresh token for rotation)
      const accessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id); // Optional: refresh token rotation
      
      res.json({
        success: true,
        message: 'Access token refreshed successfully',
        token: accessToken,
        refreshToken: newRefreshToken, // Return new refresh token for rotation
        data: {
          user
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to refresh token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async getCurrentUser(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'email', 'phoneNumber', 'houseId', 'balance', 'points', 'credit'],
        include: [{
          model: House,
          as: 'house',
          attributes: ['id', 'name'],
          required: false
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred fetching user data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Request password reset (generates and sends code)
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      
      if (!email || !validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Valid email is required'
        });
      }
      
      // Find user
      const user = await User.findOne({ where: { email } });
      
      // Always return success even if user not found (for security)
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account with that email exists, a verification code has been sent'
        });
      }
      
      // Generate 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store hashed code in database (expires in 10 minutes)
      const hashedCode = await bcrypt.hash(resetCode, 10);
      await user.update({
        resetCode: hashedCode, // Changed from resetCodeHash to resetCode
        resetCodeExpires: new Date(Date.now() + 600000) // 10 minutes
      });
      
      const emailSent = await sendPasswordResetCode(user.email, resetCode);
    
      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email);
        // Still return success to user for security reasons
      }
      
      res.json({
        success: true,
        message: 'If an account with that email exists, a verification code has been sent'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred processing your password reset request'
      });
    }
  },

  async verifyResetCode(req, res) {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'Email and verification code are required'
        });
      }
      
      // Find user
      const user = await User.findOne({ 
        where: { 
          email,
          resetCodeExpires: { [Op.gt]: new Date() }
        }
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
      }
      
      // Verify code
      const isValidCode = await bcrypt.compare(code, user.resetCode);
      if (!isValidCode) {
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code'
        });
      }
      
      // Code is valid
      res.json({
        success: true,
        message: 'Verification code is valid'
      });
    } catch (error) {
      console.error('Code verification error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred verifying the code'
      });
    }
  },
  
  // Verify code and reset password
  async resetPasswordWithCode(req, res) {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email, verification code, and new password are required'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }
      
      // Find user
      const user = await User.findOne({ 
        where: { 
          email,
          resetCodeExpires: { [Op.gt]: new Date() }
        }
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
      }
      
      // Verify code - changed from resetCodeHash to resetCode
      const isValidCode = await bcrypt.compare(code, user.resetCode);
      if (!isValidCode) {
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code'
        });
      }
      
      // Update password and clear reset code - changed from resetCodeHash to resetCode
      await user.update({
        password: newPassword, // Will be hashed by model hook
        resetCode: null,
        resetCodeExpires: null
      });
      
      res.json({
        success: true,
        message: 'Password has been successfully reset'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred resetting your password'
      });
    }
  }
  
};

module.exports = authController;
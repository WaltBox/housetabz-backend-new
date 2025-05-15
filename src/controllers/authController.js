// src/controllers/authController.js
const { User, House } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // Import Sequelize operators
const { generateAccessToken, verifyRefreshToken } = require('../middleware/auth/tokenUtils');
const { sendPasswordResetCode } = require('../services/emailService');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';


const createToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      console.log('Login attempt received:', { email });

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
        console.log('User not found');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      console.log('Password validation result:', isValidPassword);

      if (!isValidPassword) {
        console.log('Invalid password');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Log the response structure
      const response = {
        success: true,
        token,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            houseId: user.houseId,
            house: user.house,
            balance: user.balance,
            points: user.points,
            credit: user.credit
          }
        }
      };
      console.log('Sending response:', response);

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  },

  async register(req, res) {
    console.log('Registration attempt received');
    
    try {
      const { username, email, password } = req.body;

      // Input validation
      if (!username || !email || !password) {
        console.log('Registration failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      if (!validateEmail(email)) {
        console.log('Registration failed: Invalid email format');
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      if (password.length < 6) {
        console.log('Registration failed: Password too short');
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
        console.log('Registration failed: User already exists');
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Create user (password hashing is handled by model hooks)
      const user = await User.create({
        username,
        email,
        password
      });

      // Generate token
    // Generate token
const token = createToken(user);
console.log('Generated token:', token); // Debug log

res.status(201).json({
  success: true,
  message: 'Registration successful',
  data: {
    user: {
      id: user.id,
      email: user.email,
      username: user.username
    },
    token
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
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'username', 'email', 'houseId', 'balance', 'points', 'credit']
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      // Generate a new access token
      const accessToken = generateAccessToken(user.id);
      
      res.json({
        success: true,
        message: 'Access token refreshed successfully',
        data: {
          token: accessToken,
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
    console.log('Getting current user data:', { userId: req.user?.id });
    
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'email', 'houseId', 'balance', 'points', 'credit'],
        include: [{
          model: House,
          as: 'house',
          attributes: ['id', 'name'],
          required: false
        }]
      });

      if (!user) {
        console.log('Get current user failed: User not found');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('Current user data retrieved successfully');

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
        console.log('Password reset requested for non-existent email:', email);
        return res.json({
          success: true,
          message: 'If an account with that email exists, a verification code has been sent'
        });
      }
      
      // Generate 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('Generated reset code:', resetCode); // For development only
      
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

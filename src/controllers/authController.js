// src/controllers/authController.js
const { User, House } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
        console.log('Login attempt received:', { email: req.body.email });
        
        try {
          const { email, password } = req.body;
    
          // Input validation
          if (!email || !password) {
            console.log('Login failed: Missing credentials');
            return res.status(400).json({
              success: false,
              message: 'Email and password are required'
            });
          }
    
          // Find user
          const user = await User.findOne({ 
            where: { email },
            include: [{
              model: House,
              as: 'house',
              attributes: ['id', 'name'],
              required: false
            }]
          });
    
          if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({
              success: false,
              message: 'Invalid credentials'
            });
          }
    
          // Verify password - now properly awaiting the async comparison
          const isValidPassword = await user.comparePassword(password);
          console.log('Password validation result:', isValidPassword);
    
          if (!isValidPassword) {
            console.log('Login failed: Invalid password');
            return res.status(401).json({
              success: false,
              message: 'Invalid credentials'
            });
          }
    
          // Generate token
          const token = jwt.sign(
            { 
              id: user.id,
              email: user.email,
              username: user.username 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );
    
          console.log('Login successful:', { userId: user.id, email: user.email });
    
          // Return success response
          res.json({
            success: true,
            message: 'Login successful',
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
              },
              token
            }
          });
        } catch (error) {
          console.error('Login error:', error);
          res.status(500).json({
            success: false,
            message: 'An error occurred during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
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

      // Check existing user
      const existingUser = await User.findOne({
        where: {
          [User.sequelize.Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        console.log('Registration failed: User already exists');
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      // Create user
      const user = await User.create({
        username,
        email,
        password
      });

      // Generate token
      const token = createToken(user);

      console.log('Registration successful:', { userId: user.id, email: user.email });

      // Return success response
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
  }
};

module.exports = authController;
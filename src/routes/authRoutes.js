// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth/userAuth'); // Use the new middleware
const { authLimiter } = require('../middleware/security/rateLimiter');

// Apply rate limiting to login/register
router.use(['/login', '/register'], authLimiter);

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh-token', authController.refreshToken); // Add this if you have a refresh endpoint

// Protected routes
router.get('/me', authenticateUser, authController.getCurrentUser);

module.exports = router;
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
router.post('/verify-credentials', authController.verifyCredentials);
router.post('/register', authController.register);
router.post('/refresh', authController.refreshToken);

// In your auth routes
router.post('/request-reset-code', authController.requestPasswordReset);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password-with-code', authController.resetPasswordWithCode);


// Protected routes
router.get('/me', authenticateUser, authController.getCurrentUser);

module.exports = router;
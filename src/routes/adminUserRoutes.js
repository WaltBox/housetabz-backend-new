// src/routes/adminUserRoutes.js
const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { authenticateAdmin } = require('../middleware/auth/adminAuth');

// Apply admin authentication to all user routes
router.use(authenticateAdmin);

// GET /api/admin/users - Get all users with pagination and search
router.get('/', adminUserController.getAllUsers);

// GET /api/admin/users/:userId - Get specific user details
router.get('/:userId', adminUserController.getUserById);

module.exports = router;
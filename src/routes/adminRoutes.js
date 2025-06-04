// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth/adminAuth');
const { catchAsync } = require('../middleware/errorHandler');

// Public admin routes (no auth required)
router.post('/login', catchAsync(adminController.login));

// Protected admin routes (require admin token)
router.get('/me', authenticateAdmin, catchAsync(adminController.getCurrentAdmin));
router.post('/logout', authenticateAdmin, catchAsync(adminController.logout));

// Admin data access routes
router.get('/users', authenticateAdmin, catchAsync(adminController.getAllUsers));
router.get('/houses', authenticateAdmin, catchAsync(adminController.getAllHouses));
router.get('/bills', authenticateAdmin, catchAsync(adminController.getAllBills));
router.get('/analytics', authenticateAdmin, catchAsync(adminController.getDashboardAnalytics));
router.get('/user-payments', authenticateAdmin, adminController.getUserPayments);
router.get('/delinquent-users', authenticateAdmin, catchAsync(adminController.getDelinquentUsers));



// Admin management routes
router.put('/users/:userId/admin-status', authenticateAdmin, catchAsync(adminController.updateUserAdminStatus));

module.exports = router;
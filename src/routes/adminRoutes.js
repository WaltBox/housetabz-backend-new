// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminUserController = require('../controllers/adminUserController'); // Add this
const adminHouseController = require('../controllers/adminHouseController'); // Add this
const { authenticateAdmin } = require('../middleware/auth/adminAuth');
const { catchAsync } = require('../middleware/errorHandler');

// Public admin routes (no auth required)
router.post('/login', catchAsync(adminController.login));

// Protected admin routes (require admin token)
router.get('/me', authenticateAdmin, catchAsync(adminController.getCurrentAdmin));
router.post('/logout', authenticateAdmin, catchAsync(adminController.logout));

// Admin data access routes - USE THE NEW CONTROLLERS
router.get('/users', authenticateAdmin, catchAsync(adminUserController.getAllUsers)); // CHANGED
router.get('/houses', authenticateAdmin, catchAsync(adminHouseController.getAllHouses)); // CHANGED
router.get('/bills', authenticateAdmin, catchAsync(adminController.getAllBills));
router.get('/analytics', authenticateAdmin, catchAsync(adminController.getDashboardAnalytics));
router.get('/user-payments', authenticateAdmin, adminController.getUserPayments);
router.get('/delinquent-users', authenticateAdmin, catchAsync(adminController.getDelinquentUsers));
router.get('/bills/:billId', authenticateAdmin, catchAsync(adminController.getBillDetails));

// Admin messaging endpoints
router.post('/messages/send', authenticateAdmin, catchAsync(adminController.sendMessageToUsers));
router.post('/messages/send-to-house', authenticateAdmin, catchAsync(adminController.sendMessageToHouse));

// Detailed user/house routes (optional - use if you need the detailed endpoints)
// router.use('/users', require('./adminUserRoutes')); 
// router.use('/houses', require('./adminHouseRoutes'));

module.exports = router;
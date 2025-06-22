// src/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateAdmin } = require('../middleware/auth/adminAuth');

// Apply admin authentication to all transaction routes
router.use(authenticateAdmin);

// GET /api/admin/transactions - Get all transactions with filtering
router.get('/', transactionController.getAllTransactions);

// GET /api/admin/transactions/dashboard-stats - Get dashboard statistics
router.get('/dashboard-stats', transactionController.getDashboardStats);

// GET /api/admin/transactions/advance-pairs - Get advance/repayment pairs
router.get('/advance-pairs', transactionController.getAdvanceRepaymentPairs);

// GET /api/admin/transactions/user/:userId - Get transactions for specific user
router.get('/user/:userId', transactionController.getUserTransactions);

// GET /api/admin/transactions/house/:houseId - Get transactions for specific house
router.get('/house/:houseId', transactionController.getHouseTransactions);

// GET /api/admin/transactions/:transactionId - Get specific transaction details
router.get('/:transactionId', transactionController.getTransactionById);

module.exports = router;
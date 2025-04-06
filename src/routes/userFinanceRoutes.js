// src/routes/userFinanceRoutes.js
const express = require('express');
const router = express.Router();
const financeService = require('../services/financeService');
const { UserFinance } = require('../models');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

// Get user's current financial summary
router.get('/users/:userId/finance', authenticateUser, catchAsync(async (req, res) => {
    const { userId } = req.params;
        
    // Check authorization (user can only see their own finances)
    if (req.user.id != userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
        
    const userFinance = await UserFinance.findOne({
      where: { userId },
      attributes: ['balance', 'credit', 'points', 'lastTransactionDate']
    });
        
    if (!userFinance) {
      return res.status(404).json({ error: 'Financial record not found' });
    }
        
    res.json(userFinance);
  }));

// Get user's transaction history
router.get('/users/:userId/transactions', authenticateUser, catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { limit = 50, offset = 0, startDate, endDate, type } = req.query;
        
    // Check authorization
    if (req.user.id != userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
        
    const transactions = await financeService.getUserTransactions(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate,
      endDate,
      type
    });
        
    res.json(transactions);
  }));

module.exports = router;
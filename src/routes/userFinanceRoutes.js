// src/routes/userFinanceRoutes.js
const express = require('express');
const router = express.Router();
const financeService = require('../services/financeService');
const { UserFinance } = require('../models');
const auth = require('../middleware/auth');

// Get user's current financial summary
router.get('/users/:userId/finance', auth, async (req, res, next) => {
  try {
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
  } catch (error) {
    console.error('Error fetching user finance:', error);
    next(error);
  }
});

// Get user's transaction history
router.get('/users/:userId/transactions', auth, async (req, res, next) => {
  try {
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
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    next(error);
  }
});

module.exports = router;
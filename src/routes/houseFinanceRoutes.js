// src/routes/houseFinanceRoutes.js
const express = require('express');
const router = express.Router();
const financeService = require('../services/financeService');
const { HouseFinance } = require('../models');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

// Get house's current financial summary
router.get('/houses/:houseId/finance', authenticateUser, catchAsync(async (req, res) => {
    const { houseId } = req.params;
        
    // Check if user belongs to this house
    if (req.user.houseId != houseId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
        
    const houseFinance = await HouseFinance.findOne({
      where: { houseId },
      attributes: ['balance', 'ledger', 'lastTransactionDate']
    });
        
    if (!houseFinance) {
      return res.status(404).json({ error: 'Financial record not found' });
    }
        
    res.json(houseFinance);
  }));

// Get house's transaction history
router.get('/houses/:houseId/transactions', authenticateUser, catchAsync(async (req, res) => {
    const { houseId } = req.params;
    const { limit = 50, offset = 0, startDate, endDate, type } = req.query;
        
    // Check if user belongs to this house
    if (req.user.houseId != houseId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
        
    const transactions = await financeService.getHouseTransactions(houseId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate,
      endDate,
      type
    });
        
    res.json(transactions);
  }));

module.exports = router;
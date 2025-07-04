const dashboardService = require('../services/dashboardService');
const { createLogger } = require('../utils/logger');
const logger = createLogger('dashboard-controller');

const dashboardController = {
  /**
   * Get optimized dashboard data for a user
   * Replaces multiple API calls with single efficient endpoint
   */
  async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;
      const houseId = req.user.houseId;
      
      if (!houseId) {
        return res.status(400).json({ 
          error: 'User not associated with a house',
          message: 'Please join a house to view dashboard data'
        });
      }
      
      const dashboardData = await dashboardService.getDashboardData(userId, houseId);
      
      // Set aggressive cache headers since this data changes frequently
      res.set({
        'Cache-Control': 'private, max-age=60', // 1 minute cache
        'ETag': `"dashboard-${userId}-${Date.now()}"`
      });
      
      res.status(200).json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      next(error);
    }
  },
  
  /**
   * Get house overview data (for house-wide stats)
   */
  async getHouseOverview(req, res, next) {
    try {
      const { houseId } = req.params;
      
      // Authorization check
      if (req.user.houseId != houseId) {
        return res.status(403).json({ error: 'Unauthorized access to house data' });
      }
      
      const houseOverview = await dashboardService.getHouseOverview(houseId);
      
      res.set({
        'Cache-Control': 'private, max-age=120', // 2 minute cache for house data
      });
      
      res.status(200).json({
        success: true,
        data: houseOverview,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error fetching house overview:', error);
      next(error);
    }
  },
  
  /**
   * Get user's financial summary (lightweight endpoint)
   */
  async getUserFinancialSummary(req, res, next) {
    try {
      const userId = req.user.id;
      const { UserFinance, Charge } = require('../models');
      const { Op } = require('sequelize');
      
      const [userFinance, pendingCharges] = await Promise.all([
        UserFinance.findOne({
          where: { userId },
          attributes: ['balance', 'credit', 'points']
        }),
        Charge.findAll({
          where: { 
            userId, 
            status: 'unpaid',
            dueDate: { [Op.gte]: new Date() }
          },
          attributes: ['amount', 'dueDate'],
          limit: 5,
          order: [['dueDate', 'ASC']]
        })
      ]);
      
      const totalOwed = pendingCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
      const nextDueDate = pendingCharges.length > 0 ? pendingCharges[0].dueDate : null;
      
      res.set({
        'Cache-Control': 'private, max-age=30' // 30 second cache
      });
      
      res.status(200).json({
        success: true,
        data: {
          finance: userFinance || { balance: 0, credit: 0, points: 0 },
          pending: {
            totalOwed,
            chargeCount: pendingCharges.length,
            nextDueDate
          }
        }
      });
      
    } catch (error) {
      logger.error('Error fetching user financial summary:', error);
      next(error);
    }
  }
};

module.exports = dashboardController; 
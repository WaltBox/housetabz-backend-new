const dashboardService = require('../services/dashboardService');
const { createLogger } = require('../utils/logger');
const logger = createLogger('dashboard-controller');

const dashboardController = {
  /**
   * Get comprehensive dashboard data for a user
   * Replaces the complex userController.getDashboardData method
   * 
   * GET /api/dashboard/user/:userId
   */
  async getUserDashboard(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Authorization: User can only access their own dashboard unless admin
      if (req.user && req.user.id != userId && !req.user.isAdmin) {
        return res.status(403).json({ 
          error: 'Unauthorized access to user dashboard' 
        });
      }

      logger.info(`Fetching dashboard data for user ${userId}`);
      const startTime = Date.now();

      const dashboardData = await dashboardService.getDashboardData(userId);

      const responseTime = Date.now() - startTime;
      logger.info(`Dashboard data fetched for user ${userId} in ${responseTime}ms`);

      // Set cache headers for performance
      res.set({
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
        'X-Response-Time': `${responseTime}ms`,
        'X-Data-Sources': 'user,house,charges,tasks,bills,transactions,notifications'
      });

      res.status(200).json({
        success: true,
        data: dashboardData,
        meta: {
          responseTime: responseTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error fetching user dashboard:', error);
      next(error);
    }
  },

  /**
   * Get house financial overview
   * 
   * GET /api/dashboard/house/:houseId/financial-overview
   */
  async getHouseFinancialOverview(req, res, next) {
    try {
      const { houseId } = req.params;
      
      // Authorization: User must be a member of the house
      if (req.user && req.user.houseId != houseId && !req.user.isAdmin) {
        return res.status(403).json({ 
          error: 'Unauthorized access to house financial data' 
        });
      }

      logger.info(`Fetching financial overview for house ${houseId}`);
      const startTime = Date.now();

      const financialData = await dashboardService.getHouseFinancialOverview(houseId);

      const responseTime = Date.now() - startTime;
      logger.info(`Financial overview fetched for house ${houseId} in ${responseTime}ms`);

      // Set cache headers
      res.set({
        'Cache-Control': 'private, max-age=120', // Cache for 2 minutes
        'X-Response-Time': `${responseTime}ms`,
        'X-Data-Sources': 'house,bills,transactions,hsi'
      });

      res.status(200).json({
        success: true,
        data: financialData,
        meta: {
          responseTime: responseTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error fetching house financial overview:', error);
      next(error);
    }
  },

  /**
   * Get lightweight dashboard summary (for mobile or quick checks)
   * 
   * GET /api/dashboard/user/:userId/summary
   */
  async getUserSummary(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Authorization check
      if (req.user && req.user.id != userId && !req.user.isAdmin) {
        return res.status(403).json({ 
          error: 'Unauthorized access to user summary' 
        });
      }

      logger.info(`Fetching summary for user ${userId}`);
      const startTime = Date.now();

      // Use optimized summary method instead of full dashboard data
      const summaryData = await dashboardService.getUserSummary(userId);
      
      // Extract just the essential summary information
      const summary = {
        user: {
          id: summaryData.user.id,
          username: summaryData.user.username,
          balance: summaryData.user.finance.balance,
          points: summaryData.user.finance.points
        },
        house: summaryData.house ? {
          id: summaryData.house.id,
          name: summaryData.house.name,
          hsiScore: summaryData.house.hsi?.score,
          healthScore: summaryData.house.healthScore
        } : null,
        summary: summaryData.summary
      };

      const responseTime = Date.now() - startTime;
      logger.info(`Summary fetched for user ${userId} in ${responseTime}ms`);

      // Aggressive caching for summary data
      res.set({
        'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
        'X-Response-Time': `${responseTime}ms`,
        'X-Data-Type': 'summary'
      });

      res.status(200).json({
        success: true,
        data: summary,
        meta: {
          responseTime: responseTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error fetching user summary:', error);
      next(error);
    }
  }
};

module.exports = dashboardController; 
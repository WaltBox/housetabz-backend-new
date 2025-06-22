// src/controllers/transactionController.js
const { Transaction, User, House, Bill, Charge, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');
const { createLogger } = require('../utils/logger');

const logger = createLogger('transaction-controller');

const transactionController = {
  // Get all transactions with filtering and pagination
  async getAllTransactions(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type, 
        status, 
        userId, 
        houseId, 
        startDate, 
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Apply filters
      if (type) {
        if (Array.isArray(type)) {
          whereClause.type = { [Op.in]: type };
        } else {
          whereClause.type = type;
        }
      }

      if (status) {
        if (Array.isArray(status)) {
          whereClause.status = { [Op.in]: status };
        } else {
          whereClause.status = status;
        }
      }

      if (userId) whereClause.userId = userId;
      if (houseId) whereClause.houseId = houseId;

      // Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      const transactions = await Transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email'],
            required: false
          },
          {
            model: House,
            as: 'house',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Bill,
            as: 'bill',
            attributes: ['id', 'name', 'amount'],
            required: false
          },
          {
            model: Charge,
            as: 'charge',
            attributes: ['id', 'name', 'amount', 'advanced'],
            required: false
          },
          {
            model: Payment,
            as: 'payment',
            attributes: ['id', 'amount', 'status'],
            required: false
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Calculate summary statistics - FIXED: Call method directly on controller object
      const summaryStats = await transactionController.getTransactionSummary(whereClause);

      return res.json({
        transactions: transactions.rows,
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(transactions.count / limit)
        },
        summary: summaryStats,
        filters: {
          type,
          status,
          userId,
          houseId,
          startDate,
          endDate
        }
      });

    } catch (error) {
      logger.error('Error fetching transactions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch transactions',
        details: error.message 
      });
    }
  },

  // Get transaction summary statistics
  async getTransactionSummary(whereClause = {}) {
    try {
      // Total amounts by transaction type
      const typeStats = await Transaction.findAll({
        where: whereClause,
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
        ],
        group: ['type'],
        raw: true
      });

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentActivity = await Transaction.count({
        where: {
          ...whereClause,
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      });

      // Advance-specific statistics - FIXED: Call method directly on controller object
      const advanceStats = await transactionController.getAdvanceStatistics(whereClause);

      return {
        typeBreakdown: typeStats.map(stat => ({
          type: stat.type,
          count: parseInt(stat.count),
          totalAmount: parseFloat(stat.totalAmount) || 0
        })),
        recentActivity,
        advanceStats
      };

    } catch (error) {
      logger.error('Error calculating transaction summary:', error);
      return { error: 'Failed to calculate summary' };
    }
  },

  // Get advance-specific statistics
  async getAdvanceStatistics(whereClause = {}) {
    try {
      // Total advances made
      const totalAdvances = await Transaction.findOne({
        where: {
          ...whereClause,
          type: 'ADVANCE'
        },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
        ],
        raw: true
      });

      // Total advance repayments
      const totalRepayments = await Transaction.findOne({
        where: {
          ...whereClause,
          type: 'ADVANCE_REPAYMENT'
        },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
        ],
        raw: true
      });

      // Outstanding advances (advances - repayments)
      const advanceAmount = parseFloat(totalAdvances?.totalAmount) || 0;
      const repaymentAmount = parseFloat(totalRepayments?.totalAmount) || 0;
      const outstandingAmount = advanceAmount - repaymentAmount;

      return {
        totalAdvances: {
          count: parseInt(totalAdvances?.count) || 0,
          amount: advanceAmount
        },
        totalRepayments: {
          count: parseInt(totalRepayments?.count) || 0,
          amount: repaymentAmount
        },
        outstanding: {
          amount: outstandingAmount,
          isPositive: outstandingAmount > 0
        }
      };

    } catch (error) {
      logger.error('Error calculating advance statistics:', error);
      return { error: 'Failed to calculate advance stats' };
    }
  },

  // Get transactions for a specific user
  async getUserTransactions(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, type } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = { userId };
      if (type) whereClause.type = type;

      const transactions = await Transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: House,
            as: 'house',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Bill,
            as: 'bill',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Charge,
            as: 'charge',
            attributes: ['id', 'name', 'amount', 'advanced'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Get user info
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'email'],
        include: [{
          model: House,
          as: 'house',
          attributes: ['id', 'name'],
          required: false
        }]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        user,
        transactions: transactions.rows,
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(transactions.count / limit)
        }
      });

    } catch (error) {
      logger.error('Error fetching user transactions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch user transactions',
        details: error.message 
      });
    }
  },

  // Get transactions for a specific house
  async getHouseTransactions(req, res) {
    try {
      const { houseId } = req.params;
      const { page = 1, limit = 20, type } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = { houseId };
      if (type) whereClause.type = type;

      const transactions = await Transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email'],
            required: false
          },
          {
            model: Bill,
            as: 'bill',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Charge,
            as: 'charge',
            attributes: ['id', 'name', 'amount', 'advanced'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Get house info
      const house = await House.findByPk(houseId, {
        attributes: ['id', 'name'],
        include: [{
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }]
      });

      if (!house) {
        return res.status(404).json({ error: 'House not found' });
      }

      // Get advance usage for this house
      const { getAdvanceUsage } = require('../services/advanceService');
      const advanceUsage = await getAdvanceUsage(houseId);

      return res.json({
        house,
        transactions: transactions.rows,
        advanceUsage,
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(transactions.count / limit)
        }
      });

    } catch (error) {
      logger.error('Error fetching house transactions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch house transactions',
        details: error.message 
      });
    }
  },

  // Get specific transaction details
  async getTransactionById(req, res) {
    try {
      const { transactionId } = req.params;

      const transaction = await Transaction.findByPk(transactionId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'phoneNumber'],
            required: false
          },
          {
            model: House,
            as: 'house',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Bill,
            as: 'bill',
            attributes: ['id', 'name', 'amount', 'status'],
            required: false
          },
          {
            model: Charge,
            as: 'charge',
            attributes: ['id', 'name', 'amount', 'status', 'advanced', 'advancedAt', 'repaidAt'],
            required: false
          },
          {
            model: Payment,
            as: 'payment',
            attributes: ['id', 'amount', 'status', 'paymentDate'],
            required: false
          },
          {
            model: Transaction,
            as: 'relatedTransaction',
            attributes: ['id', 'type', 'amount', 'description'],
            required: false
          }
        ]
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // If this is an advance repayment, find the original advance
      let originalAdvance = null;
      if (transaction.type === 'ADVANCE_REPAYMENT' && transaction.chargeId) {
        originalAdvance = await Transaction.findOne({
          where: {
            type: 'ADVANCE',
            chargeId: transaction.chargeId
          },
          order: [['createdAt', 'ASC']]
        });
      }

      return res.json({
        transaction,
        originalAdvance
      });

    } catch (error) {
      logger.error('Error fetching transaction details:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch transaction details',
        details: error.message 
      });
    }
  },

  // Get advance/repayment pairs for analysis
  async getAdvanceRepaymentPairs(req, res) {
    try {
      const { page = 1, limit = 20, houseId } = req.query;
      const offset = (page - 1) * limit;

      // Find all advances with their corresponding repayments
      const advances = await Transaction.findAndCountAll({
        where: {
          type: 'ADVANCE',
          ...(houseId && { houseId })
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email'],
            required: false
          },
          {
            model: House,
            as: 'house',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Charge,
            as: 'charge',
            attributes: ['id', 'name', 'amount', 'advanced', 'advancedAt', 'repaidAt', 'status'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // For each advance, find the corresponding repayment
      const advanceRepaymentPairs = await Promise.all(
        advances.rows.map(async (advance) => {
          let repayment = null;
          if (advance.chargeId) {
            repayment = await Transaction.findOne({
              where: {
                type: 'ADVANCE_REPAYMENT',
                chargeId: advance.chargeId
              },
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'username', 'email'],
                  required: false
                }
              ]
            });
          }

          const daysBetween = repayment 
            ? Math.floor((new Date(repayment.createdAt) - new Date(advance.createdAt)) / (1000 * 60 * 60 * 24))
            : null;

          return {
            advance,
            repayment,
            isRepaid: !!repayment,
            daysBetween,
            status: repayment ? 'repaid' : 'outstanding'
          };
        })
      );

      return res.json({
        pairs: advanceRepaymentPairs,
        pagination: {
          total: advances.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(advances.count / limit)
        }
      });

    } catch (error) {
      logger.error('Error fetching advance repayment pairs:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch advance repayment data',
        details: error.message 
      });
    }
  },

  // Get dashboard stats for transactions
  async getDashboardStats(req, res) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalTransactions,
        recentTransactions,
        weeklyTransactions,
        totalAdvances,
        totalRepayments,
        outstandingAdvances
      ] = await Promise.all([
        Transaction.count(),
        Transaction.count({
          where: { createdAt: { [Op.gte]: thirtyDaysAgo } }
        }),
        Transaction.count({
          where: { createdAt: { [Op.gte]: sevenDaysAgo } }
        }),
        Transaction.sum('amount', {
          where: { type: 'ADVANCE' }
        }),
        Transaction.sum('amount', {
          where: { type: 'ADVANCE_REPAYMENT' }
        }),
        Transaction.sum('amount', {
          where: { 
            type: 'ADVANCE',
            chargeId: {
              [Op.notIn]: sequelize.literal(`(
                SELECT DISTINCT "chargeId" 
                FROM "Transactions" 
                WHERE "type" = 'ADVANCE_REPAYMENT' 
                AND "chargeId" IS NOT NULL
              )`)
            }
          }
        })
      ]);

      return res.json({
        overview: {
          totalTransactions,
          recentTransactions,
          weeklyTransactions
        },
        advances: {
          totalAdvanced: totalAdvances || 0,
          totalRepaid: totalRepayments || 0,
          outstanding: outstandingAdvances || 0
        }
      });

    } catch (error) {
      logger.error('Error fetching transaction dashboard stats:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch dashboard stats',
        details: error.message 
      });
    }
  }
};

module.exports = transactionController;
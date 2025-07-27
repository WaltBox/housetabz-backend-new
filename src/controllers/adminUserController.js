// src/controllers/adminUserController.js
const { User, House, Charge, Payment, Transaction, UserFinance, sequelize } = require('../models');
const { Op } = require('sequelize');
const { createLogger } = require('../utils/logger');

const logger = createLogger('admin-user-controller');

const adminUserController = {
  // Get all users with basic info and search/pagination
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 50, search } = req.query;
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Search filter (username or email)
      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        attributes: ['id', 'username', 'email', 'phoneNumber', 'houseId', 'createdAt'],
        include: [{
          model: House,
          as: 'house',
          attributes: ['id', 'name'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Get some quick stats for each user
      const usersWithStats = await Promise.all(
        users.rows.map(async (user) => {
          const [unpaidCharges, totalPaid] = await Promise.all([
            Charge.count({ where: { userId: user.id, status: 'unpaid' } }),
            Charge.sum('amount', { where: { userId: user.id, status: 'paid' } })
          ]);

          return {
            ...user.toJSON(),
            unpaidCharges,
            totalPaid: totalPaid || 0
          };
        })
      );

      return res.status(200).json({
        users: usersWithStats,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(users.count / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Get detailed user information
  async getUserById(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        include: [
          {
            model: House,
            as: 'house',
            attributes: ['id', 'name', 'city', 'state', 'house_code'],
            required: false
          },
          {
            model: UserFinance,
            as: 'finance',
            required: false
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's recent charges
      const charges = await Charge.findAll({
        where: { userId },
        attributes: ['id', 'amount', 'name', 'status', 'advanced', 'dueDate', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      // Get user's recent payments
      const payments = await Payment.findAll({
        where: { userId },
        attributes: ['id', 'amount', 'status', 'paymentDate', 'createdAt'],
        order: [['paymentDate', 'DESC']],
        limit: 10
      });

      // Get user's recent transactions
      const transactions = await Transaction.findAll({
        where: { userId },
        attributes: ['id', 'type', 'amount', 'description', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 15
      });

      // Calculate user statistics
      const [
        totalCharges,
        unpaidCharges,
        totalPaid,
        unpaidAmount,
        advancedCharges
      ] = await Promise.all([
        Charge.count({ where: { userId } }),
        Charge.count({ where: { userId, status: 'unpaid' } }),
        Charge.sum('amount', { where: { userId, status: 'paid' } }),
        Charge.sum('amount', { where: { userId, status: 'unpaid' } }),
        Charge.count({ where: { userId, advanced: true, status: 'unpaid' } })
      ]);

      const userStats = {
        totalCharges,
        unpaidCharges,
        totalPaid: totalPaid || 0,
        unpaidAmount: unpaidAmount || 0,
        advancedCharges
      };

      return res.json({
        user,
        charges,
        payments,
        transactions,
        stats: userStats
      });

    } catch (error) {
      console.error('Error fetching user details:', error);
      return res.status(500).json({ error: 'Failed to fetch user details' });
    }
  }
};

module.exports = adminUserController;
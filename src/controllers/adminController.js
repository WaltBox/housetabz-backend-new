// controllers/adminController.js
const { Admin, User, House, Bill, Charge, Transaction, sequelize } = require('../models');

const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const adminController = {
  // Admin login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required'
        });
      }

      // Check if Admin model exists
      if (!Admin) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // Find admin by email
      const admin = await Admin.findOne({
        where: {
          email: email.toLowerCase().trim(),
          isActive: true
        }
      });

      if (!admin) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last login time
      await admin.update({ lastLoginAt: new Date() });

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: admin.id, 
          email: admin.email, 
          role: admin.role,
          type: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Prepare response
      const response = {
        token, 
        message: 'Admin login successful',
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          lastLoginAt: admin.lastLoginAt
        }
      };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Login failed'
      });
    }
  },

  // Get current admin info
  async getCurrentAdmin(req, res) {
    try {
      const adminId = req.current_admin?.id;

      if (!adminId) {
        return res.status(401).json({ error: 'Admin not authenticated' });
      }
      
      const admin = await Admin.findByPk(adminId, {
        attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'lastLoginAt', 'createdAt']
      });
      
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      // Get dashboard stats
      const [totalUsers, totalHouses, totalBills, pendingBills] = await Promise.all([
        User.count(),
        House.count(),
        Bill.count(),
        Bill.count({ where: { status: 'pending' } })
      ]);

      const responseData = {
        ...admin.toJSON(),
        dashboardStats: {
          totalUsers,
          totalHouses,
          totalBills,
          pendingBills
        }
      };

      return res.json({ admin: responseData });

    } catch (error) {
      console.error('Error in getCurrentAdmin:', error);
      return res.status(500).json({ error: 'Failed to fetch admin data' });
    }
  },

  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'phoneNumber', 'houseId', 'isAdmin', 'createdAt'],
        include: [{
          model: House,
          as: 'house',
          attributes: ['id', 'name'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: 100 // Reasonable limit
      });

      return res.status(200).json({ users });

    } catch (error) {
      console.error('Error fetching all users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Get all houses (admin only)
  async getAllHouses(req, res) {
    try {
      const houses = await House.findAll({
        attributes: ['id', 'name', 'createdAt'],
        include: [{
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: 100 // Reasonable limit
      });

      return res.status(200).json({ houses });

    } catch (error) {
      console.error('Error fetching all houses:', error);
      return res.status(500).json({ error: 'Failed to fetch houses' });
    }
  },

  // Get all bills (admin only)
  async getAllBills(req, res) {
    try {
      const { page = 1, limit = 50, status, houseId } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (status) whereClause.status = status;
      if (houseId) whereClause.houseId = houseId;

      const bills = await Bill.findAndCountAll({
        where: whereClause,
        attributes: ['id', 'name', 'amount', 'status', 'billType', 'dueDate', 'createdAt', 'houseId'],
        include: [
          {
            model: House,
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Charge,
            attributes: ['id', 'amount', 'status', 'userId'],
            include: [{
              model: User,
              as: 'User', // ← Add this line with the correct alias
              attributes: ['id', 'username']
            }],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.status(200).json({
        bills: bills.rows,
        pagination: {
          total: bills.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(bills.count / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching all bills:', error);
      return res.status(500).json({ error: 'Failed to fetch bills' });
    }
  },

  // Get recent user payments (admin only)
  async getUserPayments(req, res) {
    try {
      const { Payment, User } = require('../models');
      const { filter } = req.query;
      const now = new Date();
      let dateFilter = {};
  
      if (filter === 'today') {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        dateFilter = { [Op.gte]: startOfDay };
  
      } else if (filter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - startOfWeek.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { [Op.gte]: startOfWeek };
  
      } else if (filter === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        dateFilter = { [Op.gte]: thirtyDaysAgo };
  
      } else {
        // Default: last 14 days
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(now.getDate() - 14);
        twoWeeksAgo.setHours(0, 0, 0, 0);
        dateFilter = { [Op.gte]: twoWeeksAgo };
      }
  
      const payments = await Payment.findAll({
        where: {
          paymentDate: dateFilter,
          status: 'completed',
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['paymentDate', 'DESC']],
        limit: 100,
      });
  
      const mapped = payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        status: payment.status,
        user: payment.user,
        metadata: payment.metadata,
      }));
  
      return res.status(200).json({ payments: mapped });
  
    } catch (error) {
      console.error('Error fetching user payments:', error);
      return res.status(500).json({ error: 'Failed to fetch user payments' });
    }
  },
  
  
  async getDelinquentUsers(req, res) {
    try {
      const { filter } = req.query;
      const now = new Date();
      let dateFilter = {};
  
      // Set up date filter based on the filter parameter
      if (filter === '1week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        dateFilter = { [Op.lte]: oneWeekAgo };
      } else if (filter === '1month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(now.getDate() - 30);
        dateFilter = { [Op.lte]: oneMonthAgo };
      } else {
        // Default: all overdue charges (due date is in the past)
        dateFilter = { [Op.lt]: now };
      }
  
      // Find users with unpaid charges that are overdue
      const delinquentUsers = await User.findAll({
        include: [
          {
            model: Charge,
            as: 'charges',
            where: {
              status: 'unpaid',
              dueDate: dateFilter
            },
            attributes: ['id', 'amount', 'name', 'dueDate', 'status'],
            required: true // Only include users who have matching charges
          },
          {
            model: House,
            as: 'house',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        attributes: ['id', 'username', 'email', 'phoneNumber'],
        order: [
          // Order by the oldest unpaid charge first
          [{ model: Charge, as: 'charges' }, 'dueDate', 'ASC']
        ],
        limit: 50 // Reasonable limit
      });
  
      // Transform the data to make it easier to work with on the frontend
      const transformedUsers = delinquentUsers.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        house: user.house,
        unpaidCharges: user.charges.map(charge => ({
          id: charge.id,
          amount: charge.amount,
          name: charge.name,
          dueDate: charge.dueDate,
          status: charge.status
        }))
      }));
  
      return res.status(200).json({ 
        delinquentUsers: transformedUsers,
        count: transformedUsers.length,
        filter: filter || 'all'
      });
  
    } catch (error) {
      console.error('Error fetching delinquent users:', error);
      return res.status(500).json({ error: 'Failed to fetch delinquent users' });
    }
  },

  // Get dashboard analytics (admin only)
  async getDashboardAnalytics(req, res) {
    try {
      // Basic counts
      const [totalUsers, totalHouses, totalBills] = await Promise.all([
        User.count(),
        House.count(),
        Bill.count()
      ]);

      // Bill status breakdown
      const billStatusCounts = await Bill.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('status')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [recentUsers, recentBills] = await Promise.all([
        User.count({
          where: {
            createdAt: { [Op.gte]: thirtyDaysAgo }
          }
        }),
        Bill.count({
          where: {
            createdAt: { [Op.gte]: thirtyDaysAgo }
          }
        })
      ]);

      // Total revenue (sum of paid bills)
      const totalRevenue = await Bill.sum('amount', {
        where: { status: 'paid' }
      }) || 0;

      const analytics = {
        overview: {
          totalUsers,
          totalHouses,
          totalBills,
          totalRevenue
        },
        billStatusBreakdown: billStatusCounts,
        recentActivity: {
          newUsers: recentUsers,
          newBills: recentBills
        }
      };

      return res.status(200).json(analytics);

    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  },

  // Update user admin status
  async updateUserAdminStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isAdmin } = req.body;

      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ error: 'isAdmin must be a boolean value' });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await user.update({ isAdmin });

      return res.status(200).json({
        message: `User ${isAdmin ? 'granted' : 'revoked'} admin privileges successfully`,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin
        }
      });

    } catch (error) {
      console.error('Error updating user admin status:', error);
      return res.status(500).json({ error: 'Failed to update user admin status' });
    }
  },

  // Admin logout
  logout(req, res) {
    try {
      return res.status(200).json({ 
        message: 'Admin logout successful. Please clear your token on the client side.' 
      });
    } catch (error) {
      console.error('Error during admin logout:', error);
      return res.status(500).json({ error: 'Failed to log out' });
    }
  }
};

module.exports = adminController;
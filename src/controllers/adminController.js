// controllers/adminController.js
const { Admin, User, House, Bill, Charge, Transaction, sequelize } = require('../models');

const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { canAdvanceCharge } = require('../services/advanceService');

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

  // Get all bills (admin only) - FIXED ADVANCE LOGIC
  async getAllBills(req, res) {
    try {
      const { page = 1, limit = 50, status, houseId } = req.query;
      const offset = (page - 1) * limit;
  
      const whereClause = {};
      if (status) whereClause.status = status;
      if (houseId) whereClause.houseId = houseId;
  
      const bills = await Bill.findAndCountAll({
        where: whereClause,
        attributes: [
          'id',
          'name',
          'amount',
          'status',
          'billType',
          'dueDate',
          'createdAt',
          'houseId',
          'providerPaid',
          'providerPaidAt',
          'frontedAmount'
        ],
        include: [
          {
            model: House,
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Charge,
            attributes: ['id', 'amount', 'status', 'advanced'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
  
      // Add advance logic per bill
      for (const bill of bills.rows) {
        if (bill.houseId && (bill.status === 'pending' || bill.status === 'partial_paid')) {
          const unpaidAmount = bill.Charges?.reduce((sum, charge) => {
            return charge.status === 'unpaid' ? sum + parseFloat(charge.amount) : sum;
          }, 0) ?? 0;

          const advance = await canAdvanceCharge(bill.houseId, unpaidAmount);
          
          // Calculate what's already been advanced
          const alreadyAdvanced = parseFloat(bill.frontedAmount) || 0;
          
          // Calculate how much more advancement is needed
          const additionalAdvancementNeeded = Math.max(0, unpaidAmount - alreadyAdvanced);

          bill.setDataValue('advanceStatus', {
            houseAdvanceAllowance: advance.allowance,
            unpaidAmount: unpaidAmount,
            alreadyAdvanced: alreadyAdvanced,
            additionalAdvancementNeeded: additionalAdvancementNeeded,
            canAdvanceAdditional: additionalAdvancementNeeded > 0 && additionalAdvancementNeeded <= advance.remaining
          });
        } else {
          // Set null for non-pending bills
          bill.setDataValue('advanceStatus', null);
        }
      }
  
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

  // Get detailed bill information (admin only) - FIXED ADVANCE LOGIC
  async getBillDetails(req, res) {
    try {
      const { billId } = req.params;

      const bill = await Bill.findByPk(billId, {
        attributes: [
          'id', 'name', 'amount', 'baseAmount', 'serviceFeeTotal', 
          'status', 'billType', 'dueDate', 'createdAt', 
          'providerPaid', 'providerPaidAt', 'frontedAmount', 'metadata', 'houseId'
        ],
        include: [
          {
            model: House,
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Charge,
            attributes: ['id', 'amount', 'baseAmount', 'serviceFee', 'status', 'name', 'userId', 'dueDate', 'metadata', 'advanced', 'advancedAt', 'repaidAt'],
            include: [
              {
                model: User,
                as: 'User',
                attributes: ['id', 'username', 'email', 'phoneNumber']
              },
            ],
            required: false
          },
          {
            model: sequelize.models.HouseService,
            as: 'houseServiceModel', 
            attributes: [
              'id', 'name', 'type', 'billingSource', 'status', 'amount',
              'houseTabzAgreementId', 'externalAgreementId', 'partnerId',
              'designatedUserId', 'createDay', 'dueDay', 'reminderDay',
              'accountNumber', 'feeCategory', 'metadata'
            ],
            include: [
              {
                model: User,
                as: 'designatedUser',
                attributes: ['id', 'username', 'email', 'phoneNumber'],
                required: false
              },
              {
                model: sequelize.models.Partner,
                as: 'partner',
                attributes: ['id', 'name'],
                required: false
              }
            ],
            required: false
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email'],
            required: false
          }
        ],
      });

      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      // CORRECTED ADVANCE CHECK
      if (bill.houseId && (bill.status === 'pending' || bill.status === 'partial_paid')) {
        // Calculate how much money is still needed (unpaid charges)
        const unpaidAmount = bill.Charges?.reduce((sum, charge) => {
          return charge.status === 'unpaid' ? sum + parseFloat(charge.amount) : sum;
        }, 0) ?? 0;

        // Calculate what's already been advanced
        const alreadyAdvanced = parseFloat(bill.frontedAmount) || 0;

        // Calculate how much more advancement is needed
        const additionalAdvancementNeeded = Math.max(0, unpaidAmount - alreadyAdvanced);

        // Get the house's advance allowance
        const advance = await canAdvanceCharge(bill.houseId, unpaidAmount);
        
        console.log('DEBUG - Advance check result:', {
          unpaidAmount,
          alreadyAdvanced,
          additionalAdvancementNeeded,
          allowance: advance.allowance,
          remaining: advance.remaining,
          allowed: advance.allowed,
          calculation: additionalAdvancementNeeded <= advance.remaining
        });

        bill.setDataValue('advanceStatus', {
          isAdvanceable: advance.allowed && additionalAdvancementNeeded > 0,
          houseAdvanceAllowance: advance.allowance,
          unpaidAmount: unpaidAmount,
          alreadyFronted: alreadyAdvanced, // Keep this name for backwards compatibility with frontend
          additionalFrontingNeeded: additionalAdvancementNeeded, // Keep this name for backwards compatibility with frontend
          canAdvanceAdditional: additionalAdvancementNeeded > 0 && additionalAdvancementNeeded <= advance.remaining,
          reason: advance.allowed 
            ? `House allowance: ${advance.allowance}. Unpaid: ${unpaidAmount}. Already advanced: ${alreadyAdvanced}.`
            : `Unpaid amount (${unpaidAmount}) exceeds house advance allowance (${advance.allowance})`
        });
      }

      return res.status(200).json(bill);

    } catch (error) {
      console.error('Error fetching bill details:', error);
      return res.status(500).json({ error: 'Failed to fetch bill details' });
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
  },

  // Send message to specific users with push notifications
  async sendMessageToUsers(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { userIds, title, message, type = 'admin_message', data = {} } = req.body;
      const adminId = req.current_admin.id;
      const adminName = req.current_admin.name || req.current_admin.email;

      // Validate required fields
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'userIds array is required and must contain at least one user ID' 
        });
      }

      if (!title || !message) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'title and message are required' 
        });
      }

      // Validate user IDs exist and are active
      const users = await User.findAll({
        where: { 
          id: { [Op.in]: userIds },
          // Add any additional conditions like isActive if you have such field
        },
        transaction
      });

      if (users.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ 
          error: 'No valid users found with the provided user IDs' 
        });
      }

      const foundUserIds = users.map(user => user.id);
      const notFoundUserIds = userIds.filter(id => !foundUserIds.includes(parseInt(id)));

      // Create notification metadata
      const metadata = {
        ...data,
        adminId,
        adminName,
        source: 'admin_message',
        timestamp: new Date().toISOString()
      };

      // Create notifications for all users
      const notificationPromises = users.map(user => 
        sequelize.models.Notification.create({
          userId: user.id,
          title,
          message,
          type,
          metadata,
          isRead: false
        }, { transaction })
      );

      const notifications = await Promise.all(notificationPromises);
      
      // Commit transaction first
      await transaction.commit();

      // Send push notifications after transaction commits (non-blocking)
      const pushResults = [];
      
      for (const user of users) {
        try {
          // Import push notification service
          const pushNotificationService = require('../services/pushNotificationService');
          
          await pushNotificationService.sendPushNotification(user, {
            title,
            message,
            data: {
              ...metadata,
              notificationId: notifications.find(n => n.userId === user.id)?.id,
              type
            }
          });
          
          pushResults.push({ userId: user.id, status: 'sent' });
        } catch (pushError) {
          console.error(`Failed to send push notification to user ${user.id}:`, pushError);
          pushResults.push({ 
            userId: user.id, 
            status: 'failed', 
            error: pushError.message 
          });
        }
      }

      // Return success response
      return res.status(200).json({
        message: 'Messages sent successfully',
        summary: {
          totalRequested: userIds.length,
          notificationsCreated: notifications.length,
          pushNotificationsSent: pushResults.filter(r => r.status === 'sent').length,
          pushNotificationsFailed: pushResults.filter(r => r.status === 'failed').length
        },
        details: {
          notificationsCreated: notifications.map(n => ({
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message
          })),
          pushResults,
          notFoundUserIds: notFoundUserIds.length > 0 ? notFoundUserIds : undefined
        }
      });

    } catch (error) {
      // Only rollback if transaction is still active
      if (!transaction.finished) {
        await transaction.rollback();
      }
      
             console.error('Error sending admin message to users:', error);
       return res.status(500).json({ 
         error: 'Failed to send messages',
         details: error.message 
       });
     }
   },

   // Send message to all users in a house
   async sendMessageToHouse(req, res) {
     const transaction = await sequelize.transaction();
     
     try {
       const { houseId, title, message, type = 'admin_house_message', data = {} } = req.body;
       const adminId = req.current_admin.id;
       const adminName = req.current_admin.name || req.current_admin.email;

       // Validate required fields
       if (!houseId) {
         await transaction.rollback();
         return res.status(400).json({ 
           error: 'houseId is required' 
         });
       }

       if (!title || !message) {
         await transaction.rollback();
         return res.status(400).json({ 
           error: 'title and message are required' 
         });
       }

       // Validate house exists and get all users in the house
       const house = await House.findByPk(houseId, { transaction });
       if (!house) {
         await transaction.rollback();
         return res.status(404).json({ 
           error: 'House not found' 
         });
       }

       const users = await User.findAll({
         where: { houseId: houseId },
         transaction
       });

       if (users.length === 0) {
         await transaction.rollback();
         return res.status(404).json({ 
           error: 'No users found in this house' 
         });
       }

       // Create notification metadata
       const metadata = {
         ...data,
         adminId,
         adminName,
         houseId,
         houseName: house.name,
         source: 'admin_house_message',
         timestamp: new Date().toISOString()
       };

       // Create notifications for all users in the house
       const notificationPromises = users.map(user => 
         sequelize.models.Notification.create({
           userId: user.id,
           title,
           message,
           type,
           metadata,
           isRead: false
         }, { transaction })
       );

       const notifications = await Promise.all(notificationPromises);
       
       // Commit transaction first
       await transaction.commit();

       // Send push notifications after transaction commits (non-blocking)
       const pushResults = [];
       
       for (const user of users) {
         try {
           const pushNotificationService = require('../services/pushNotificationService');
           
           await pushNotificationService.sendPushNotification(user, {
             title,
             message,
             data: {
               ...metadata,
               notificationId: notifications.find(n => n.userId === user.id)?.id,
               type
             }
           });
           
           pushResults.push({ userId: user.id, status: 'sent' });
         } catch (pushError) {
           console.error(`Failed to send push notification to user ${user.id}:`, pushError);
           pushResults.push({ 
             userId: user.id, 
             status: 'failed', 
             error: pushError.message 
           });
         }
       }

       // Return success response
       return res.status(200).json({
         message: 'Messages sent successfully to all users in house',
         summary: {
           houseId,
           houseName: house.name,
           usersInHouse: users.length,
           notificationsCreated: notifications.length,
           pushNotificationsSent: pushResults.filter(r => r.status === 'sent').length,
           pushNotificationsFailed: pushResults.filter(r => r.status === 'failed').length
         },
         details: {
           notificationsCreated: notifications.map(n => ({
             id: n.id,
             userId: n.userId,
             title: n.title,
             message: n.message
           })),
           pushResults
         }
       });

     } catch (error) {
       // Only rollback if transaction is still active
       if (!transaction.finished) {
         await transaction.rollback();
       }
       
       console.error('Error sending admin message to house:', error);
       return res.status(500).json({ 
         error: 'Failed to send messages to house',
         details: error.message 
       });
     }
   }
 };

 module.exports = adminController;
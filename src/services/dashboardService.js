const { 
  User, 
  House, 
  Bill, 
  Charge, 
  HouseService, 
  HouseFinance, 
  UserFinance,
  HouseStatusIndex,
  Notification,
  Task,
  ServiceRequestBundle,
  StagedRequest,
  TakeOverRequest,
  VirtualCardRequest,
  Transaction,
  UrgentMessage,
  BillSubmission,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

// Simple in-memory cache for dashboard summaries
const summaryCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds cache

class DashboardService {
  /**
   * Get optimized dashboard data for a user in the feature/fix-shit branch
   * This replaces the complex userController.getDashboardData method with efficient parallel queries
   */
  async getDashboardData(userId) {
    try {
      // First get basic user info to determine houseId
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'houseId', 'onboarded', 'onboarding_step', 'onboarded_at'],
        include: [{
          model: UserFinance,
          as: 'finance',
          attributes: ['balance', 'credit', 'points'],
          required: false
        }]
      });

      if (!user) {
        throw new Error('User not found');
      }

      const houseId = user.houseId;

      // Define all queries to run in parallel
      const queries = {};

      // 1. House data with HSI and finance (if user has a house)
      if (houseId) {
        queries.houseData = House.findByPk(houseId, {
          attributes: ['id', 'name', 'city', 'state'],
          include: [
            {
              model: HouseStatusIndex,
              as: 'statusIndex',
              attributes: ['score', 'bracket', 'feeMultiplier', 'creditMultiplier', 'currentRiskFactor'],
              required: false
            },
            {
              model: HouseFinance,
              as: 'finance',
              attributes: ['balance', 'ledger'],
              required: false
            }
          ]
        });
      }

      // 2. User's pending charges (most urgent)
      queries.pendingCharges = Charge.findAll({
        where: { 
          userId, 
          status: 'unpaid'
        },
        attributes: ['id', 'amount', 'baseAmount', 'serviceFee', 'name', 'status', 'dueDate', 'advanced'],
        include: [{
          model: Bill,
          attributes: ['id', 'name', 'billType', 'houseId'],
          include: [{
            model: HouseService,
            as: 'houseServiceModel',
            attributes: ['id', 'name', 'type']
          }],
          required: false
        }],
        order: [['dueDate', 'ASC']],
        limit: 10
      });

      // 3. User's pending tasks with service bundles
      queries.pendingTasks = Task.findAll({
        where: { 
          userId,
          status: false // Only pending tasks
        },
        attributes: [
          'id', 'type', 'status', 'userId', 'response', 'paymentRequired', 
          'paymentAmount', 'monthlyAmount', 'paymentStatus', 'createdAt', 'serviceRequestBundleId'
        ],
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          attributes: ['id', 'totalPaidUpfront', 'status', 'type'],
          include: [
            {
              model: TakeOverRequest,
              as: 'takeOverRequest',
              attributes: ['id', 'serviceName', 'serviceType', 'monthlyAmount'],
              required: false
            },
            {
              model: StagedRequest,
              as: 'stagedRequest',
              attributes: ['id', 'serviceName', 'serviceType', 'partnerName'],
              required: false
            },
            {
              model: VirtualCardRequest,
              as: 'virtualCardRequest',
              attributes: ['id', 'serviceName', 'serviceType'],
              required: false
            }
          ],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      // 4. Recent bills for house overview (if user has a house)
      if (houseId) {
        queries.recentBills = Bill.findAll({
          where: { 
            houseId,
            createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          },
          attributes: ['id', 'name', 'amount', 'baseAmount', 'status', 'billType', 'createdAt', 'dueDate'],
          include: [{
            model: HouseService,
            as: 'houseServiceModel',
            attributes: ['id', 'name', 'type']
          }],
          order: [['createdAt', 'DESC']],
          limit: 10
        });
      }

      // 5. Recent transactions for financial history
      queries.recentTransactions = Transaction.findAll({
        where: { userId },
        attributes: ['id', 'type', 'amount', 'description', 'createdAt', 'status'],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // 6. Unread notifications
      queries.notifications = Notification.findAll({
        where: { userId, isRead: false },
        attributes: ['id', 'message', 'createdAt', 'metadata'],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      // 7. Urgent messages (unresolved)
      queries.urgentMessages = UrgentMessage.findAll({
        where: { 
          userId, 
          isResolved: false // Correct field name
        },
        attributes: ['id', 'type', 'title', 'body', 'metadata', 'created_at', 'isResolved', 'isRead', 'billId', 'chargeId'],
        include: [
          {
            model: Charge,
            as: 'charge',
            attributes: ['id', 'amount', 'name', 'dueDate'],
            required: false
          },
          {
            model: Bill,
            as: 'bill',
            attributes: ['id', 'name', 'amount'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      // 8. Pending bill submissions (if user has a house)
      if (houseId) {
        queries.billSubmissions = BillSubmission.findAll({
          where: { 
            [Op.or]: [
              { userId: userId }, // Submissions by this user (correct field name)
              { '$houseService.houseId$': houseId } // Submissions for this house
            ],
            status: { [Op.in]: ['pending', 'completed'] } // Correct status options
          },
          attributes: ['id', 'amount', 'status', 'dueDate', 'createdAt', 'userId'],
          include: [
            {
              model: HouseService,
              as: 'houseService',
              attributes: ['id', 'name', 'type', 'houseId']
            },
            {
              model: User,
              as: 'user', // Correct relationship name
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 10
        });
      }

      // 9. House services count (if user has a house)
      if (houseId) {
        queries.houseServicesCount = HouseService.count({
          where: { houseId }
        });
      }

      // Execute all queries in parallel
      const results = await Promise.allSettled([
        Promise.resolve(user), // User data we already have
        queries.houseData || Promise.resolve(null),
        queries.pendingCharges,
        queries.pendingTasks,
        queries.recentBills || Promise.resolve([]),
        queries.recentTransactions,
        queries.notifications,
        queries.urgentMessages,
        queries.billSubmissions || Promise.resolve([]),
        queries.houseServicesCount || Promise.resolve(0)
      ]);

      // Process results
      const [
        userResult,
        houseDataResult,
        pendingChargesResult,
        pendingTasksResult,
        recentBillsResult,
        recentTransactionsResult,
        notificationsResult,
        urgentMessagesResult,
        billSubmissionsResult,
        houseServicesCountResult
      ] = results;

      // Extract data with error handling
      const userData = userResult.status === 'fulfilled' ? userResult.value : null;
      const houseData = houseDataResult.status === 'fulfilled' ? houseDataResult.value : null;
      const pendingCharges = pendingChargesResult.status === 'fulfilled' ? pendingChargesResult.value : [];
      const pendingTasks = pendingTasksResult.status === 'fulfilled' ? pendingTasksResult.value : [];
      const recentBills = recentBillsResult.status === 'fulfilled' ? recentBillsResult.value : [];
      const recentTransactions = recentTransactionsResult.status === 'fulfilled' ? recentTransactionsResult.value : [];
      const notifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : [];
      const urgentMessages = urgentMessagesResult.status === 'fulfilled' ? urgentMessagesResult.value : [];
      const billSubmissions = billSubmissionsResult.status === 'fulfilled' ? billSubmissionsResult.value : [];
      const houseServicesCount = houseServicesCountResult.status === 'fulfilled' ? houseServicesCountResult.value : 0;

      // Calculate summary statistics
      const totalOwed = pendingCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
      const advancedCharges = pendingCharges.filter(charge => charge.advanced);
      const totalAdvanced = advancedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
      
      const upcomingDue = pendingCharges.find(charge => {
        if (!charge.dueDate) return false;
        const dueDate = new Date(charge.dueDate);
        const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 7 && daysUntilDue >= 0; // Due within a week
      });

      const overdueBills = pendingCharges.filter(charge => {
        if (!charge.dueDate) return false;
        return new Date(charge.dueDate) < new Date();
      });

      const pendingTasksRequiringPayment = pendingTasks.filter(task => 
        task.paymentRequired && task.paymentStatus !== 'completed'
      );

      // House health score calculation
      let houseHealthScore = 'good';
      if (houseData?.statusIndex) {
        const hsiScore = houseData.statusIndex.score;
        if (hsiScore < 30) houseHealthScore = 'poor';
        else if (hsiScore < 60) houseHealthScore = 'fair';
        else if (hsiScore < 80) houseHealthScore = 'good';
        else houseHealthScore = 'excellent';
      }

      return {
        user: {
          id: userData.id,
          username: userData.username,
          houseId: userData.houseId,
          onboarded: userData.onboarded,
          onboarding_step: userData.onboarding_step,
          onboarded_at: userData.onboarded_at,
          finance: userData.finance ? {
            balance: parseFloat(userData.finance.balance || 0),
            credit: parseFloat(userData.finance.credit || 0),
            points: userData.finance.points || 0
          } : { balance: 0, credit: 0, points: 0 }
        },
        house: houseData ? {
          id: houseData.id,
          name: houseData.name,
          location: `${houseData.city}, ${houseData.state}`,
          finance: houseData.finance ? {
            balance: parseFloat(houseData.finance.balance || 0),
            ledger: parseFloat(houseData.finance.ledger || 0)
          } : { balance: 0, ledger: 0 },
          hsi: houseData.statusIndex ? {
            score: houseData.statusIndex.score,
            bracket: houseData.statusIndex.bracket,
            feeMultiplier: parseFloat(houseData.statusIndex.feeMultiplier || 1),
            creditMultiplier: parseFloat(houseData.statusIndex.creditMultiplier || 1),
            riskFactor: parseFloat(houseData.statusIndex.currentRiskFactor || 0)
          } : null,
          healthScore: houseHealthScore,
          houseServicesCount: houseServicesCount
        } : null,
        pendingCharges: pendingCharges.map(charge => ({
          id: charge.id,
          amount: parseFloat(charge.amount || 0),
          baseAmount: parseFloat(charge.baseAmount || 0),
          serviceFee: parseFloat(charge.serviceFee || 0),
          name: charge.name,
          status: charge.status,
          dueDate: charge.dueDate,
          advanced: charge.advanced,
          daysUntilDue: charge.dueDate ? Math.ceil((new Date(charge.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          bill: charge.Bill ? {
            id: charge.Bill.id,
            name: charge.Bill.name,
            billType: charge.Bill.billType,
            service: charge.Bill.houseServiceModel ? {
              id: charge.Bill.houseServiceModel.id,
              name: charge.Bill.houseServiceModel.name,
              type: charge.Bill.houseServiceModel.type
            } : null
          } : null
        })),
        pendingTasks,
        recentBills,
        recentTransactions,
        notifications,
        urgentMessages: urgentMessages.map(msg => ({
          id: msg.id,
          type: msg.type,
          message: `${msg.title}: ${msg.body}`, // Combine title and body
          metadata: msg.metadata,
          createdAt: msg.created_at,
          resolved: msg.isResolved,
          billId: msg.billId, // Add billId field
          chargeId: msg.chargeId, // Add chargeId field for completeness
          charge: msg.charge ? {
            id: msg.charge.id,
            amount: parseFloat(msg.charge.amount || 0),
            name: msg.charge.name,
            dueDate: msg.charge.dueDate
          } : null,
          bill: msg.bill ? {
            id: msg.bill.id,
            name: msg.bill.name,
            amount: parseFloat(msg.bill.amount || 0)
          } : null
        })),
        billSubmissions: billSubmissions.map(submission => ({
          id: submission.id,
          amount: submission.amount ? parseFloat(submission.amount) : null,
          status: submission.status,
          dueDate: submission.dueDate,
          createdAt: submission.createdAt,
          submittedBy: submission.userId, // Use correct field name
          houseService: submission.houseService ? {
            id: submission.houseService.id,
            name: submission.houseService.name,
            type: submission.houseService.type
          } : null,
          submitter: submission.user ? {
            id: submission.user.id,
            username: submission.user.username
          } : null
        })),
        summary: {
          totalOwed: totalOwed.toFixed(2),
          totalAdvanced: totalAdvanced.toFixed(2),
          advancedChargesCount: advancedCharges.length,
          upcomingDue: upcomingDue ? {
            amount: parseFloat(upcomingDue.amount),
            dueDate: upcomingDue.dueDate,
            name: upcomingDue.name
          } : null,
          overdueCount: overdueBills.length,
          pendingTasksCount: pendingTasks.length,
          tasksRequiringPayment: pendingTasksRequiringPayment.length,
          unreadNotifications: notifications.length,
          urgentMessagesCount: urgentMessages.length,
          billSubmissionsCount: billSubmissions.length,
          recentBillsCount: recentBills.length
        }
      };

    } catch (error) {
      console.error('Error in getDashboardData:', error);
      throw error;
    }
  }

  /**
   * Get optimized dashboard summary (lightweight version)
   * Only fetches essential data needed for summary endpoint
   */
  async getUserSummary(userId) {
    try {
      // Check cache first
      const cacheKey = `summary_${userId}`;
      const cached = summaryCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[dashboard-service] Cache hit for user ${userId}`);
        return cached.data;
      }
      // Get basic user info with finance in one query
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'houseId', 'onboarded', 'onboarding_step', 'onboarded_at'],
        include: [{
          model: UserFinance,
          as: 'finance',
          attributes: ['balance', 'credit', 'points'],
          required: false
        }]
      });

      if (!user) {
        throw new Error('User not found');
      }

      const houseId = user.houseId;

      // Define optimized parallel queries (only what we need for summary)
      const summaryQueries = [
        // 1. House data with HSI (minimal data)
        houseId ? House.findByPk(houseId, {
          attributes: ['id', 'name', 'city', 'state'],
          include: [{
            model: HouseStatusIndex,
            as: 'statusIndex',
            attributes: ['score', 'bracket', 'feeMultiplier', 'creditMultiplier', 'currentRiskFactor'],
            required: false
          }]
        }) : Promise.resolve(null),

        // 2. Pending charges (for summary calculations)
        Charge.findAll({
          where: { userId, status: 'unpaid' },
          attributes: ['id', 'amount', 'baseAmount', 'serviceFee', 'name', 'dueDate', 'advanced'],
          order: [['dueDate', 'ASC']],
          limit: 10
        }),

        // 3. Counts instead of full data (much faster)
        Task.count({
          where: { userId, status: false }
        }),

        // 4. Unread notifications count
        Notification.count({
          where: { userId, isRead: false }
        }),

        // 5. Urgent messages count
        UrgentMessage.count({
          where: { userId, isResolved: false }
        }),

        // 6. Recent bills count (if user has house)
        houseId ? Bill.count({
          where: { 
            houseId,
            createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }) : Promise.resolve(0),

        // 7. Bill submissions count (if user has house)
        houseId ? BillSubmission.count({
          where: { 
            [Op.or]: [
              { userId: userId },
              { '$houseService.houseId$': houseId }
            ],
            status: { [Op.in]: ['pending', 'completed'] }
          },
          include: [{
            model: HouseService,
            as: 'houseService',
            attributes: []
          }]
        }) : Promise.resolve(0),

        // 8. House services count (if user has house)
        houseId ? HouseService.count({
          where: { houseId }
        }) : Promise.resolve(0)
      ];

      // Execute all queries in parallel
      const [
        houseData,
        pendingCharges,
        pendingTasksCount,
        unreadNotificationsCount,
        urgentMessagesCount,
        recentBillsCount,
        billSubmissionsCount,
        houseServicesCount
      ] = await Promise.all(summaryQueries);

      // Calculate summary statistics (same logic as getDashboardData)
      const totalOwed = pendingCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
      const advancedCharges = pendingCharges.filter(charge => charge.advanced);
      const totalAdvanced = advancedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
      
      const upcomingDue = pendingCharges.find(charge => {
        if (!charge.dueDate) return false;
        const dueDate = new Date(charge.dueDate);
        const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 7 && daysUntilDue >= 0;
      });

      const overdueBills = pendingCharges.filter(charge => {
        if (!charge.dueDate) return false;
        return new Date(charge.dueDate) < new Date();
      });

      // House health score calculation
      let houseHealthScore = 'good';
      if (houseData?.statusIndex) {
        const hsiScore = houseData.statusIndex.score;
        if (hsiScore < 30) houseHealthScore = 'poor';
        else if (hsiScore < 60) houseHealthScore = 'fair';
        else if (hsiScore < 80) houseHealthScore = 'good';
        else houseHealthScore = 'excellent';
      }

             const result = {
         user: {
           id: user.id,
           username: user.username,
           houseId: user.houseId,
           finance: user.finance ? {
             balance: parseFloat(user.finance.balance || 0),
             credit: parseFloat(user.finance.credit || 0),
             points: user.finance.points || 0
           } : { balance: 0, credit: 0, points: 0 }
         },
         house: houseData ? {
           id: houseData.id,
           name: houseData.name,
           location: `${houseData.city}, ${houseData.state}`,
           hsi: houseData.statusIndex ? {
             score: houseData.statusIndex.score,
             bracket: houseData.statusIndex.bracket,
             feeMultiplier: parseFloat(houseData.statusIndex.feeMultiplier || 1),
             creditMultiplier: parseFloat(houseData.statusIndex.creditMultiplier || 1),
             riskFactor: parseFloat(houseData.statusIndex.currentRiskFactor || 0)
           } : null,
           healthScore: houseHealthScore,
           houseServicesCount: houseServicesCount
         } : null,
         summary: {
           totalOwed: totalOwed.toFixed(2),
           totalAdvanced: totalAdvanced.toFixed(2),
           advancedChargesCount: advancedCharges.length,
           upcomingDue: upcomingDue ? {
             amount: parseFloat(upcomingDue.amount),
             dueDate: upcomingDue.dueDate,
             name: upcomingDue.name
           } : null,
           overdueCount: overdueBills.length,
           pendingTasksCount: pendingTasksCount,
           tasksRequiringPayment: 0, // We'd need additional query for this, skip for now
           unreadNotifications: unreadNotificationsCount,
           urgentMessagesCount: urgentMessagesCount,
           billSubmissionsCount: billSubmissionsCount,
           recentBillsCount: recentBillsCount
         }
       };

       // Cache the result
       summaryCache.set(cacheKey, {
         data: result,
         timestamp: Date.now()
       });

       // Clean up old cache entries periodically
       if (summaryCache.size > 100) {
         const now = Date.now();
         for (const [key, value] of summaryCache.entries()) {
           if (now - value.timestamp > CACHE_TTL) {
             summaryCache.delete(key);
           }
         }
       }

       console.log(`[dashboard-service] Cache miss for user ${userId} - data cached`);
       return result;

    } catch (error) {
      console.error('Error in getUserSummary:', error);
      throw error;
    }
  }

  /**
   * Clear cache for user's dashboard summary
   * Call this when user data changes (payments, bills, etc.)
   */
  static clearUserSummaryCache(userId) {
    const cacheKey = `summary_${userId}`;
    summaryCache.delete(cacheKey);
    console.log(`[dashboard-service] Cache cleared for user ${userId}`);
  }

  /**
   * Clear all dashboard summary cache
   */
  static clearAllSummaryCache() {
    summaryCache.clear();
    console.log('[dashboard-service] All dashboard summary cache cleared');
  }

  /**
   * Get house financial overview
   */
  async getHouseFinancialOverview(houseId) {
    try {
      const [houseData, pendingBills, recentTransactions] = await Promise.all([
        House.findByPk(houseId, {
          include: [
            {
              model: HouseStatusIndex,
              as: 'statusIndex',
              attributes: ['score', 'bracket', 'feeMultiplier', 'creditMultiplier', 'currentRiskFactor', 'unpaidAmount']
            },
            {
              model: HouseFinance,
              as: 'finance',
              attributes: ['balance', 'ledger']
            }
          ]
        }),
        Bill.findAll({
          where: { houseId, status: { [Op.ne]: 'paid' } },
          attributes: ['id', 'name', 'amount', 'baseAmount', 'serviceFeeTotal', 'status', 'dueDate'],
          include: [{
            model: Charge,
            attributes: ['id', 'userId', 'amount', 'status', 'advanced'],
            include: [{
              model: User,
              attributes: ['id', 'username']
            }]
          }],
          order: [['dueDate', 'ASC']]
        }),
        Transaction.findAll({
          where: { 
            houseId, 
            createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          attributes: ['id', 'type', 'amount', 'description', 'createdAt'],
          order: [['createdAt', 'DESC']],
          limit: 20
        })
      ]);

      if (!houseData) {
        throw new Error('House not found');
      }

      const totalOutstanding = pendingBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
      const totalAdvanced = pendingBills.reduce((sum, bill) => {
        const advancedCharges = bill.Charges?.filter(charge => charge.advanced) || [];
        return sum + advancedCharges.reduce((chargeSum, charge) => chargeSum + parseFloat(charge.amount), 0);
      }, 0);

      return {
        house: {
          id: houseData.id,
          name: houseData.name,
          finance: houseData.finance ? {
            balance: parseFloat(houseData.finance.balance || 0),
            ledger: parseFloat(houseData.finance.ledger || 0)
          } : { balance: 0, ledger: 0 },
          hsi: houseData.statusIndex ? {
            score: houseData.statusIndex.score,
            bracket: houseData.statusIndex.bracket,
            feeMultiplier: parseFloat(houseData.statusIndex.feeMultiplier),
            creditMultiplier: parseFloat(houseData.statusIndex.creditMultiplier),
            riskFactor: parseFloat(houseData.statusIndex.currentRiskFactor || 0),
            unpaidAmount: parseFloat(houseData.statusIndex.unpaidAmount || 0)
          } : null
        },
        pendingBills,
        recentTransactions,
        summary: {
          totalOutstanding: totalOutstanding.toFixed(2),
          totalAdvanced: totalAdvanced.toFixed(2),
          pendingBillsCount: pendingBills.length,
          recentTransactionCount: recentTransactions.length
        }
      };

    } catch (error) {
      console.error('Error in getHouseFinancialOverview:', error);
      throw error;
    }
  }
}

module.exports = new DashboardService(); 
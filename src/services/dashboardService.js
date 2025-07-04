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
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

class DashboardService {
  /**
   * Get optimized dashboard data for a user
   * This replaces multiple API calls with a single efficient query
   */
  async getDashboardData(userId, houseId) {
    const queries = {};
    
    // 1. User's financial summary
    queries.userFinance = UserFinance.findOne({
      where: { userId },
      attributes: ['balance', 'credit', 'points']
    });
    
    // 2. House basic info + HSI
    queries.houseData = House.findByPk(houseId, {
      attributes: ['id', 'name', 'city', 'state'],
      include: [
        {
          model: HouseStatusIndex,
          as: 'statusIndex',
          attributes: ['score', 'bracket', 'feeMultiplier']
        },
        {
          model: HouseFinance,
          as: 'finance',
          attributes: ['balance', 'ledger']
        }
      ]
    });
    
    // 3. User's pending charges (most urgent)
    queries.pendingCharges = Charge.findAll({
      where: { 
        userId, 
        status: 'unpaid',
        dueDate: { [Op.gte]: new Date() } // Not overdue yet
      },
      attributes: ['id', 'amount', 'name', 'status', 'dueDate'],
      include: [
        {
          model: Bill,
          attributes: ['id', 'name', 'billType'],
          include: [
            {
              model: HouseService,
              as: 'houseServiceModel',
              attributes: ['id', 'name', 'type']
            }
          ]
        }
      ],
      order: [['dueDate', 'ASC']],
      limit: 5 // Only next 5 upcoming charges
    });
    
    // 4. Recent bills summary (for house overview)
    queries.recentBills = Bill.findAll({
      where: { 
        houseId,
        createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      attributes: ['id', 'name', 'amount', 'status', 'billType', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    // 5. Active house services (for service overview)
    queries.activeServices = HouseService.findAll({
      where: { houseId, status: 'active' },
      attributes: ['id', 'name', 'type', 'amount', 'feeCategory'],
      limit: 10
    });
    
    // 6. Unread notifications (limited)
    queries.notifications = Notification.findAll({
      where: { userId, isRead: false },
      attributes: ['id', 'message', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Execute all queries in parallel
    const results = await Promise.all([
      queries.userFinance,
      queries.houseData,
      queries.pendingCharges,
      queries.recentBills,
      queries.activeServices,
      queries.notifications
    ]);
    
    const [
      userFinance,
      houseData,
      pendingCharges,
      recentBills,
      activeServices,
      notifications
    ] = results;
    
    // Calculate summary statistics
    const totalOwed = pendingCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
    const pendingBillsCount = recentBills.filter(bill => bill.status === 'pending').length;
    const upcomingDue = pendingCharges.find(charge => {
      const dueDate = new Date(charge.dueDate);
      const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7; // Due within a week
    });
    
    return {
      user: {
        id: userId,
        finance: userFinance || { balance: 0, credit: 0, points: 0 },
        totalOwed,
        hasUpcomingDue: !!upcomingDue
      },
      house: {
        ...houseData?.toJSON(),
        hsi: houseData?.statusIndex?.score || 50,
        feeMultiplier: houseData?.statusIndex?.feeMultiplier || 1.0,
        balance: houseData?.finance?.balance || 0
      },
      charges: {
        pending: pendingCharges.map(charge => ({
          id: charge.id,
          amount: charge.amount,
          name: charge.name,
          dueDate: charge.dueDate,
          serviceName: charge.Bill?.houseServiceModel?.name || charge.Bill?.name,
          serviceType: charge.Bill?.houseServiceModel?.type,
          billType: charge.Bill?.billType
        })),
        totalOwed
      },
      bills: {
        recent: recentBills.map(bill => ({
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          status: bill.status,
          billType: bill.billType,
          createdAt: bill.createdAt
        })),
        pendingCount: pendingBillsCount
      },
      services: {
        active: activeServices.map(service => ({
          id: service.id,
          name: service.name,
          type: service.type,
          amount: service.amount,
          feeCategory: service.feeCategory
        })),
        totalActive: activeServices.length
      },
      notifications: {
        unread: notifications.map(notif => ({
          id: notif.id,
          message: notif.message,
          createdAt: notif.createdAt
        })),
        unreadCount: notifications.length
      },
      summary: {
        totalOwed,
        pendingBillsCount,
        activeServicesCount: activeServices.length,
        unreadNotifications: notifications.length,
        houseHealth: this.calculateHouseHealth(houseData?.statusIndex?.score || 50, pendingBillsCount)
      }
    };
  }
  
  /**
   * Get lightweight house overview data
   */
  async getHouseOverview(houseId) {
    const [houseData, billSummary, serviceSummary] = await Promise.all([
      // House basic info
      House.findByPk(houseId, {
        attributes: ['id', 'name', 'city', 'state'],
        include: [
          {
            model: User,
            as: 'users',
            attributes: ['id', 'username']
          },
          {
            model: HouseStatusIndex,
            as: 'statusIndex',
            attributes: ['score', 'bracket']
          },
          {
            model: HouseFinance,
            as: 'finance',
            attributes: ['balance']
          }
        ]
      }),
      
      // Bill summary stats
      Bill.findAll({
        where: { houseId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        group: ['status'],
        raw: true
      }),
      
      // Service summary stats
      HouseService.findAll({
        where: { houseId },
        attributes: [
          'type',
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['type', 'status'],
        raw: true
      })
    ]);
    
    return {
      house: houseData,
      billSummary,
      serviceSummary
    };
  }
  
  /**
   * Calculate house health score based on HSI and pending bills
   */
  calculateHouseHealth(hsiScore, pendingBillsCount) {
    let health = 'excellent';
    
    if (hsiScore < 30 || pendingBillsCount > 5) {
      health = 'poor';
    } else if (hsiScore < 50 || pendingBillsCount > 2) {
      health = 'fair';
    } else if (hsiScore < 70) {
      health = 'good';
    }
    
    return health;
  }
}

module.exports = new DashboardService(); 
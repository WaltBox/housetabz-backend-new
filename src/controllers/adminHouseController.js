// src/controllers/adminHouseController.js
const { 
    House, 
    User, 
    Bill, 
    Charge, 
    Transaction, 
    HouseFinance,
    HouseStatusIndex,
    sequelize 
  } = require('../models');
  const { Op } = require('sequelize');
  const { createLogger } = require('../utils/logger');
  const { getAdvanceUsage } = require('../services/advanceService');
  
  const logger = createLogger('admin-house-controller');
  
  const adminHouseController = {
    // Get all houses with basic info and search/pagination
    async getAllHouses(req, res) {
      try {
        const { page = 1, limit = 50, search } = req.query;
        const offset = (page - 1) * limit;
        const whereClause = {};
  
        // Search filter (name or city)
        if (search) {
          whereClause[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { city: { [Op.iLike]: `%${search}%` } }
          ];
        }
  
        const houses = await House.findAndCountAll({
          where: whereClause,
          attributes: ['id', 'name', 'city', 'state', 'zip_code', 'house_code', 'createdAt'],
          include: [
            {
              model: User,
              as: 'users', // FIXED: Added the alias
              attributes: ['id', 'username'],
              required: false
            },
            {
              model: HouseStatusIndex,
              as: 'statusIndex',
              attributes: ['score', 'bracket', 'creditMultiplier'],
              required: false
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset),
          distinct: true
        });
  
        // Get some quick stats for each house
        const housesWithStats = await Promise.all(
          houses.rows.map(async (house) => {
            const [userCount, unpaidAmount, advanceUsage] = await Promise.all([
              User.count({ where: { houseId: house.id } }),
              sequelize.query(`
                SELECT COALESCE(SUM(c.amount), 0) as total
                FROM "Charges" c
                INNER JOIN "Bills" b ON c."billId" = b.id
                WHERE b."houseId" = :houseId AND c.status = 'unpaid'
              `, {
                replacements: { houseId: house.id },
                type: sequelize.QueryTypes.SELECT
              }),
              getAdvanceUsage(house.id)
            ]);
  
            return {
              ...house.toJSON(),
              userCount,
              unpaidAmount: parseFloat(unpaidAmount[0]?.total) || 0,
              advanceUsage: {
                allowance: advanceUsage.allowance,
                outstandingAdvanced: advanceUsage.outstandingAdvanced,
                remaining: advanceUsage.remaining
              }
            };
          })
        );
  
        return res.status(200).json({
          houses: housesWithStats,
          pagination: {
            total: houses.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(houses.count / limit)
          }
        });
  
      } catch (error) {
        console.error('Error fetching houses:', error);
        return res.status(500).json({ error: 'Failed to fetch houses' });
      }
    },
  
    // Get detailed house information
    async getHouseById(req, res) {
      try {
        const { houseId } = req.params;
  
        const house = await House.findByPk(houseId, {
          include: [
            {
              model: User,
              as: 'users', // FIXED: Added the alias
              attributes: ['id', 'username', 'email', 'phoneNumber', 'createdAt']
            },
            {
              model: HouseFinance,
              as: 'finance'
            },
            {
              model: HouseStatusIndex,
              as: 'statusIndex'
            }
          ]
        });
  
        if (!house) {
          return res.status(404).json({ error: 'House not found' });
        }
  
        // Get recent bills for this house
        const recentBills = await Bill.findAll({
          where: { houseId },
          attributes: ['id', 'name', 'amount', 'status', 'billType', 'dueDate', 'createdAt'],
          include: [
            {
              model: Charge,
              attributes: ['id', 'amount', 'status', 'advanced', 'userId'],
              include: [
                {
                  model: User,
                  as: 'User',
                  attributes: ['id', 'username'],
                  required: false
                }
              ]
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 15
        });
  
        // Get recent transactions for this house
        const recentTransactions = await Transaction.findAll({
          where: { houseId },
          attributes: ['id', 'type', 'amount', 'description', 'userId', 'createdAt'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username'],
              required: false
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 20
        });
  
        // Get advance usage
        const advanceUsage = await getAdvanceUsage(houseId);
  
        // Calculate house statistics
        const [
          totalBills,
          unpaidBills,
          totalUsers,
          totalTransactions
        ] = await Promise.all([
          Bill.count({ where: { houseId } }),
          Bill.count({ where: { houseId, status: ['pending', 'partial_paid'] } }),
          User.count({ where: { houseId } }),
          Transaction.count({ where: { houseId } })
        ]);
  
        const [totalUnpaidAmount, totalAdvancedAmount] = await Promise.all([
          sequelize.query(`
            SELECT COALESCE(SUM(c.amount), 0) as total
            FROM "Charges" c
            INNER JOIN "Bills" b ON c."billId" = b.id
            WHERE b."houseId" = :houseId AND c.status = 'unpaid'
          `, {
            replacements: { houseId },
            type: sequelize.QueryTypes.SELECT
          }),
          sequelize.query(`
            SELECT COALESCE(SUM(c.amount), 0) as total
            FROM "Charges" c
            INNER JOIN "Bills" b ON c."billId" = b.id
            WHERE b."houseId" = :houseId AND c.advanced = true AND c.status = 'unpaid'
          `, {
            replacements: { houseId },
            type: sequelize.QueryTypes.SELECT
          })
        ]);
  
        const houseStats = {
          totalBills,
          unpaidBills,
          totalUsers,
          totalTransactions,
          totalUnpaidAmount: parseFloat(totalUnpaidAmount[0]?.total) || 0,
          totalAdvancedAmount: parseFloat(totalAdvancedAmount[0]?.total) || 0
        };
  
        return res.json({
          house,
          recentBills,
          recentTransactions,
          advanceUsage,
          stats: houseStats
        });
  
      } catch (error) {
        console.error('Error fetching house details:', error);
        return res.status(500).json({ error: 'Failed to fetch house details' });
      }
    }
  };
  
  module.exports = adminHouseController;
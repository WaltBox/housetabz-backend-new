// Fixed controller with proper Sequelize Op import
const { Charge, User, Bill, sequelize } = require('../models');
const { Op } = require('sequelize');  // Add this import
const { createLogger } = require('../utils/logger');

const logger = createLogger('charge-controller');

// Get a specific charge by its ID
exports.getChargeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const charge = await Charge.findByPk(id, {
      attributes: ['id', 'amount', 'name', 'status', 'dueDate', 'metadata'],
      include: {
        model: Bill,
        attributes: ['id', 'name'],
      },
    });

    if (!charge) {
      return res.status(404).json({ message: 'Charge not found' });
    }

    res.status(200).json(charge);
  } catch (error) {
    console.error('Error fetching charge by ID:', error);
    next(error);
  }
};

// Get all charges for a specific user
exports.getChargesForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const charges = await Charge.findAll({
      where: { userId },
      attributes: ['id', 'amount', 'name', 'status', 'dueDate', 'metadata'],
      include: {
        model: Bill,
        attributes: ['id', 'name'],
      },
      order: [['dueDate', 'ASC']]
    });

    res.status(200).json(charges);
  } catch (error) {
    console.error('Error fetching charges for user:', error);
    next(error);
  }
};

// Get only unpaid charges for a specific user
exports.getUnpaidChargesForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const charges = await Charge.findAll({
      where: { 
        userId,
        status: { [Op.ne]: 'paid' } // Use imported Op instead of sequelize.Op
      },
      attributes: ['id', 'amount', 'name', 'status', 'dueDate', 'metadata'],
      include: {
        model: Bill,
        attributes: ['id', 'name'],
      },
      order: [['dueDate', 'ASC']]
    });
    
    res.status(200).json(charges);
  } catch (error) {
    logger.error('Error fetching unpaid charges for user:', error);
    next(error);
  }
};
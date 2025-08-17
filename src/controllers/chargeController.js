// Fixed controller with proper Sequelize Op import
const { Charge, User, Bill, sequelize } = require('../models');
const { Op } = require('sequelize');
const { createLogger } = require('../utils/logger');

const logger = createLogger('charge-controller');

// Get a specific charge by its ID
exports.getChargeById = async (req, res, next) => {
  try {
    const { userId, id } = req.params;

    // Authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to charge' });
    }

    const charge = await Charge.findOne({
      where: {
        id,
        userId // Ensure the charge belongs to the user
      },
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
    logger.error('Error fetching charge by ID:', error);
    next(error);
  }
};

// Get all charges for a specific user
exports.getChargesForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to charges' });
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
    logger.error('Error fetching charges for user:', error);
    next(error);
  }
};

// Get only unpaid charges for a specific user
exports.getUnpaidChargesForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to charges' });
    }
    
    const charges = await Charge.findAll({
      where: { 
        userId,
        status: { [Op.ne]: 'paid' }
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

// Get only paid charges for a specific user
exports.getPaidChargesForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to charges' });
    }
    
    const charges = await Charge.findAll({
      where: { 
        userId,
        status: 'paid'
      },
      attributes: ['id', 'amount', 'name', 'status', 'dueDate', 'metadata'],
      include: {
        model: Bill,
        attributes: ['id', 'name'],
      },
      order: [['dueDate', 'DESC']] // Most recent paid charges first
    });
    
    res.status(200).json(charges);
  } catch (error) {
    logger.error('Error fetching paid charges for user:', error);
    next(error);
  }
};
const db = require('../models');
const { Op } = require('sequelize');
const Joi = require('joi');

const Deal = db.Deal;
const Partner = db.Partner;

// Joi Schema for validation
const dealSchema = Joi.object({
  name: Joi.string().required(),
  details: Joi.string().required(),
  expiration_date: Joi.date().required(),
  partner_ids: Joi.array().items(Joi.number()),
});

// Create a new deal
exports.createDeal = async (req, res, next) => {
  try {
    const { error } = dealSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, details, expiration_date, partner_ids } = req.body;

    // Create the deal
    const newDeal = await Deal.create({ name, details, expiration_date });

    // Associate partners if provided
    if (partner_ids && partner_ids.length > 0) {
      const partners = await Partner.findAll({
        where: { id: partner_ids },
      });

      if (partners.length !== partner_ids.length) {
        return res.status(404).json({
          message: 'One or more provided partner IDs do not exist.',
        });
      }

      await newDeal.addPartners(partners);
    }

    res.status(201).json({ message: 'Deal created successfully', deal: newDeal });
  } catch (error) {
    console.error('Error creating deal:', error);
    next(error);
  }
};

// Get all deals
exports.getAllDeals = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, includeExpired = false } = req.query;
    const offset = (page - 1) * limit;

    // Filter to exclude expired deals unless includeExpired is true
    const currentDate = new Date();
    const whereCondition = includeExpired === 'true' ? {} : { expiration_date: { [Op.gt]: currentDate } };

    const deals = await Deal.findAndCountAll({
      where: whereCondition,
      include: {
        model: Partner,
        through: { attributes: [] },
      },
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      total: deals.count,
      totalPages: Math.ceil(deals.count / limit),
      currentPage: parseInt(page),
      deals: deals.rows,
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    next(error);
  }
};

// Get a single deal by ID
exports.getDealById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findByPk(id, {
      include: {
        model: Partner,
        through: { attributes: [] },
      },
    });

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.status(200).json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    next(error);
  }
};

// Update a deal
exports.updateDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, details, expiration_date, partner_ids } = req.body;

    const deal = await Deal.findByPk(id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Update the deal
    await deal.update({ name, details, expiration_date });

    // Reassociate partners if partner_ids are provided
    if (partner_ids && partner_ids.length > 0) {
      const partners = await Partner.findAll({
        where: { id: partner_ids },
      });

      if (partners.length !== partner_ids.length) {
        return res.status(404).json({
          message: 'One or more provided partner IDs do not exist.',
        });
      }

      await deal.setPartners(partners);
    }

    res.status(200).json({ message: 'Deal updated successfully', deal });
  } catch (error) {
    console.error('Error updating deal:', error);
    next(error);
  }
};

// Delete a deal
exports.deleteDeal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findByPk(id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    await deal.destroy();
    res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    next(error);
  }
};

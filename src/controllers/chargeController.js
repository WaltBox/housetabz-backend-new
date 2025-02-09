const { Charge, User, Bill } = require('../models');

// Get a specific charge by its ID
exports.getChargeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const charge = await Charge.findByPk(id, {
      attributes: ['id', 'amount', 'name'], // Include `name`
      include: {
        model: Bill,
        attributes: ['id', 'name'], // Include the associated bill's name
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
      attributes: ['id', 'amount', 'name'], // Include `name`
      include: {
        model: Bill,
        attributes: ['id', 'name'], // Include the associated bill's name
      },
    });

    res.status(200).json(charges);
  } catch (error) {
    console.error('Error fetching charges for user:', error);
    next(error);
  }
};

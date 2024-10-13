const { House, User } = require('../models');

// Create a new house
exports.createHouse = async (req, res, next) => {
  try {
    // Extract new address fields from request body
    const { name, address_line, secondary_line, city, state, zip_code } = req.body;

    // Create the house using the new fields
    const house = await House.create({
      name,
      address_line,
      secondary_line,
      city,
      state,
      zip_code
    });

    res.status(201).json({
      message: 'House created successfully',
      house,
    });
  } catch (error) {
    next(error);
  }
};

// Get all houses
exports.getAllHouses = async (req, res, next) => {
  try {
    const houses = await House.findAll({ include: 'users' });
    res.status(200).json(houses);
  } catch (error) {
    next(error);
  }
};

// Get house by ID with associated users
exports.getHouse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const house = await House.findByPk(id, {
      include: [{
        model: User,
        as: 'users',  // Assuming 'users' is the association alias
        attributes: ['id', 'username', 'email', 'balance', 'points', 'credit'],  // Include relevant user fields
      }],
    });

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    res.status(200).json(house);
  } catch (error) {
    next(error);
  }
};

// Update a house
exports.updateHouse = async (req, res, next) => {
  try {
    // Extract new address fields from request body
    const { name, address_line, secondary_line, city, state, zip_code } = req.body;

    const house = await House.findByPk(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // Update the house with the new fields
    await house.update({
      name,
      address_line,
      secondary_line,
      city,
      state,
      zip_code
    });

    res.json({
      message: 'House updated successfully',
      house,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a house
exports.deleteHouse = async (req, res, next) => {
  try {
    const house = await House.findByPk(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }
    await house.destroy();
    res.json({ message: 'House deleted successfully' });
  } catch (error) {
    next(error);
  }
};

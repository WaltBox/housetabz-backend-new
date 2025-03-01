// src/controllers/houseController.js
const { House, User, Bill } = require('../models');
const axios = require('axios'); // still available if needed for other calls

// Create a new house and update the creator's houseId
exports.createHouse = async (req, res, next) => {
  try {
    // Extract the fields from the request body
    // Now only require name, city, state, zip_code, and creator_id
    const { name, city, state, zip_code, creator_id } = req.body;

    // Create the house with the provided data and set the creator_id
    const house = await House.create({
      name,
      city,
      state,
      zip_code,
      creator_id,
    });

    // Optionally update the creator user's houseId here if desired:
    // await User.update({ houseId: house.id }, { where: { id: creator_id } });

    res.status(201).json({
      message: 'House created successfully',
      house,
    });
  } catch (error) {
    next(error);
  }
};

// Get all houses (including associated users)
exports.getAllHouses = async (req, res, next) => {
  try {
    const houses = await House.findAll({ include: 'users' });
    res.status(200).json(houses);
  } catch (error) {
    next(error);
  }
};

// Get house by ID with associated users and bills
exports.getHouse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const house = await House.findByPk(id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'username', 'email', 'balance', 'points', 'credit'],
        },
        {
          model: Bill,
          as: 'bills',
          attributes: ['id', 'name', 'amount', 'status', 'createdAt', 'updatedAt'],
        },
      ],
    });

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    res.status(200).json(house);
  } catch (error) {
    console.error('Error fetching house:', error);
    next(error);
  }
};

// Update a house (only update name, city, state, and zip_code)
exports.updateHouse = async (req, res, next) => {
  try {
    const { name, city, state, zip_code } = req.body;

    const house = await House.findByPk(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    await house.update({
      name,
      city,
      state,
      zip_code,
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

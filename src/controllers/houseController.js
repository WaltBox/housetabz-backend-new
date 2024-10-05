// src/controllers/houseController.js
const { House, User } = require('../models');

// Create a new house
exports.createHouse = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    const house = await House.create({ name, address });
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

// Get a single house
exports.getHouse = async (req, res, next) => {
  try {
    const house = await House.findByPk(req.params.id, { include: 'users' });
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }
    res.json(house);
  } catch (error) {
    next(error);
  }
};

// Update a house
exports.updateHouse = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    const house = await House.findByPk(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }
    await house.update({ name, address });
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

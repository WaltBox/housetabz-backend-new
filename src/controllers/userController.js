// src/controllers/userController.js
const { User, House, Charge, Task } = require('../models');
const { Op } = require('sequelize');  // Add this import

// Create a new user
exports.createUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Create user with password
    const user = await User.create({
      username,
      email,
      password // Will be hashed by User model's beforeCreate hook
    });

    // Return user without password
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Validation error' });
    }
    next(error);
  }
};

// Rest of your controller methods remain the same...
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email']
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'houseId', 'balance', 'points', 'credit'],
      include: [
        {
          model: House,
          as: 'house',
          attributes: ['id', 'name']
        },
        {
          model: Charge,
          as: 'charges',
          attributes: ['id', 'amount', 'status', 'billId', 'name'],
          include: [
            {
              model: require('../models').Bill,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'type', 'status', 'response', 'createdAt', 'updatedAt']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { username, email, houseId } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.update({ username, email, houseId });
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        houseId: user.houseId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateUserHouse = async (req, res) => {
  const { id } = req.params;
  const { houseId } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.houseId = houseId;
    await user.save();
    res.status(200).json({ message: 'User houseId updated', user });
  } catch (error) {
    console.error('Error updating houseId:', error);
    res.status(500).json({ message: 'Error updating houseId', error });
  }
};
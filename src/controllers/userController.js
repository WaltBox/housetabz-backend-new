// src/controllers/userController.js
const { User, House, Charge, Task } = require('../models');

// Create a new user
exports.createUser = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const user = await User.create({ username, email });
    res.status(201).json({
      message: 'User created successfully',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    next(error);
  }
};

// Get all users
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

// Get a single user with house, charge, and task details
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'houseId', 'balance', 'points', 'credit'],
      include: [
        {
          model: House,
          as: 'house', // Ensure this alias matches your association definition
          attributes: ['id', 'name']
        },
        {
          model: Charge,
          as: 'charges', // Ensure this alias matches your association definition
          // Replace "paid" with "status" since the Charge model uses the "status" field.
          attributes: ['id', 'amount', 'status', 'billId', 'name'],
          include: [
            {
              model: require('../models').Bill, // Include the associated Bill
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: Task, // Include tasks associated with the user
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

// Update a user
exports.updateUser = async (req, res, next) => {
  try {
    console.log('Request Body:', req.body);
    const { username, email, houseId } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.update({ username, email, houseId });
    res.json({
      message: 'User updated successfully',
      user: { id: user.id, username: user.username, email: user.email, houseId: user.houseId }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a user
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

// Update user's houseId
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

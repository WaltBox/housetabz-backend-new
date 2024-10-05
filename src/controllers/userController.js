const { User } = require('../models');

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

// Get a single user
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email']
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
    try {
      console.log('Request body:', req.body); // Log the incoming request body
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
      console.error('Error updating user:', error); // Log errors if any
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
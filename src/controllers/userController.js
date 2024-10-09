const { User, House } = require('../models');

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

// Get a single user with house details
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'houseId', 'balance'], // Fetch user attributes
      include: {
        model: House,  // Include house details
        as: 'house',   // Ensure alias matches model association
        attributes: ['id', 'name'],  // Only include id and name for house
        balance: ['balance'] // Include balance for user
      }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user); // Return user details including house
  } catch (error) {
    console.error('Error fetching user:', error);
    next(error);
  }
};



exports.updateUser = async (req, res, next) => {
    try {
      console.log('Request Body:', req.body); // Log the request data
  
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
  const { id } = req.params; // Get the user ID from URL params
  const { houseId } = req.body; // Get the houseId from the request body

  try {
    // Find the user by their ID
    const user = await User.findByPk(id);  // Sequelize method to find user

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's houseId
    user.houseId = houseId;
    await user.save();  // Save the updated user

    // Respond with success message and updated user
    res.status(200).json({ message: 'User houseId updated', user });
  } catch (error) {
    console.error('Error updating houseId:', error);
    res.status(500).json({ message: 'Error updating houseId', error });
  }
};
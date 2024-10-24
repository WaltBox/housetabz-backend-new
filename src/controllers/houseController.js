const { House, User } = require('../models');
const axios = require('axios'); // Import axios for API requests

// Create a new house and update it with meter_id and utility_id
exports.createHouse = async (req, res, next) => {
  try {
    // Extract new address fields from request body
    const { name, address_line, secondary_line, city, state, zip_code } = req.body;

    // Step 1: Create the house with initial data
    const house = await House.create({
      name,
      address_line,
      secondary_line,
      city,
      state,
      zip_code,
    });

    res.status(201).json({
      message: 'House created successfully',
      house,
    });

    // Step 2: Make the API call to fetch meter_id and utility_id
    try {
      const response = await axios.post('http://localhost:3000/api/v2/addresses/availability', {
        address_line,
        secondary_line,
        city,
        state,
        zip_code,
      });

      const addressData = response.data?.results?.[0]; // Use optional chaining

      if (addressData) {
        const { meter_id, utility_id } = addressData;

        // Step 3: Update the house with meter_id and utility_id
        await house.update({ meter_id, utility_id });

        console.log('House updated with meter_id and utility_id:', { meter_id, utility_id });
      } else {
        console.warn('No address data found in API response.');
      }
    } catch (apiError) {
      console.error('Error fetching address availability:', apiError);
    }
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
    const { name, address_line, secondary_line, city, state, zip_code } = req.body;

    const house = await House.findByPk(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    await house.update({
      name,
      address_line,
      secondary_line,
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

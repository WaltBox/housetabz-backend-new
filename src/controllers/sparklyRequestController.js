// controllers/sparklyRequestController.js
const { SparklyRequest, ServiceRequestBundle } = require('../models');

exports.createSparklyRequest = async (req, res) => {
  const { houseId, userId, num_rooms, house_size, frequency } = req.body;

  try {
    // Create ServiceRequestBundle
    const bundle = await ServiceRequestBundle.create({
      houseId,
      userId,
      status: 'pending',
    });

    // Create SparklyRequest and link to the bundle
    const sparklyRequest = await SparklyRequest.create({
      service_request_bundle_id: bundle.id,
      house_id: houseId,
      user_id: userId,
      num_rooms,
      house_size,
      frequency,
    });

    res.status(201).json({
      message: 'Sparkly request created successfully',
      sparklyRequest,
    });
  } catch (error) {
    console.error('Error creating SparklyRequest:', error);
    res.status(500).json({ error: 'Failed to create SparklyRequest' });
  }
};

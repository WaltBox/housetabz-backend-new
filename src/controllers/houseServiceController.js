// controllers/houseServiceController.js
const { HouseService } = require('../models');

// Create a new HouseService
exports.createHouseService = async (req, res) => {
  try {
    const { name, status, type, houseId } = req.body;

    const houseService = await HouseService.create({ name, status, type, houseId });

    res.status(201).json({
      message: 'HouseService created successfully',
      houseService,
    });
  } catch (error) {
    console.error('Error creating HouseService:', error);
    res.status(500).json({ message: 'Failed to create HouseService' });
  }
};

// Get all HouseServices
exports.getAllHouseServices = async (req, res) => {
  try {
    const houseServices = await HouseService.findAll();
    res.status(200).json(houseServices);
  } catch (error) {
    console.error('Error fetching HouseServices:', error);
    res.status(500).json({ message: 'Failed to fetch HouseServices' });
  }
};


// Function to get HouseService with its associated RhythmOfferRequest
exports.getHouseServiceById = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Query the HouseService with the associated RhythmOfferRequest
      const houseService = await HouseService.findOne({
        where: { id },
        include: [
          {
            model: sequelize.models.RhythmOfferRequest,
            required: false,
            where: { association_type: 'RhythmOfferRequest' }, // Only include if it's linked to RhythmOfferRequest
          },
        ],
      });
  
      if (!houseService) {
        return res.status(404).json({ message: 'HouseService not found' });
      }
  
      res.status(200).json(houseService);
    } catch (error) {
      console.error('Error fetching HouseService:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
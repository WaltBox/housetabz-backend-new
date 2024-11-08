// routes/houseServiceRoutes.js
const express = require('express');
const router = express.Router();
const houseServiceController = require('../controllers/houseServiceController');

// POST - Create a new HouseService
router.post('/', houseServiceController.createHouseService);

// GET - Get all HouseServices
router.get('/', houseServiceController.getAllHouseServices);

// GET - Get a HouseService by ID
router.get('/:id', houseServiceController.getHouseServiceById);

module.exports = router;

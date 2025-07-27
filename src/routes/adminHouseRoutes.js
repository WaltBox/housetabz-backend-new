// src/routes/adminHouseRoutes.js
const express = require('express');
const router = express.Router();
const adminHouseController = require('../controllers/adminHouseController');
const { authenticateAdmin } = require('../middleware/auth/adminAuth');

// Apply admin authentication to all house routes
router.use(authenticateAdmin);

// GET /api/admin/houses - Get all houses with pagination and search
router.get('/', adminHouseController.getAllHouses);

// GET /api/admin/houses/:houseId - Get specific house details
router.get('/:houseId', adminHouseController.getHouseById);

module.exports = router;
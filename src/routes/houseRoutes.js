// src/routes/houseRoutes.js
const express = require('express');
const router = express.Router();
const houseController = require('../controllers/houseController');

router.post('/', houseController.createHouse);
router.get('/', houseController.getAllHouses);
router.get('/:id', houseController.getHouse);
router.put('/:id', houseController.updateHouse);
router.delete('/:id', houseController.deleteHouse);

module.exports = router;

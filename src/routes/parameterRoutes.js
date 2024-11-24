const express = require('express');
const router = express.Router();
const parameterController = require('../controllers/parameterController');

// Add a new parameter to a form
router.post('/', parameterController.addParameter);

// Delete a parameter
router.delete('/:id', parameterController.deleteParameter);

module.exports = router;

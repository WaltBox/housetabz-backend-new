const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth/userAuth');
const houseServiceLedgerController = require('../controllers/houseServiceLedgerController');

// Fix: match function name exported from controller
router.get(
  '/house-service/:houseServiceId/active',
  authenticateUser,
  houseServiceLedgerController.getActiveLedger // 👈 was wrong
);

router.get(
  '/house-service/:houseServiceId',
  authenticateUser,
  houseServiceLedgerController.getAllLedgersForHouseService
);

module.exports = router;

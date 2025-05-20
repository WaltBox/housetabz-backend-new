const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth/userAuth');
const houseServiceLedgerController = require('../controllers/houseServiceLedgerController');

// Get active ledger for a house service
router.get(
  '/house-service/:houseServiceId/active',
  authenticateUser,
  houseServiceLedgerController.getActiveLedger
);

// Get all ledgers for a house service
router.get(
  '/house-service/:houseServiceId',
  authenticateUser,
  houseServiceLedgerController.getAllLedgersForHouseService
);

// New route: Get detailed funding information for a specific ledger
router.get(
  '/:ledgerId/funding',
  authenticateUser,
  houseServiceLedgerController.getFundingDetails
);

// New route: Get funding summary for a house service across all ledgers
router.get(
  '/house-service/:houseServiceId/funding-summary',
  authenticateUser,
  houseServiceLedgerController.getFundingSummary
);

module.exports = router;
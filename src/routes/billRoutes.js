// src/routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticateAdmin } = require('../middleware/auth/adminAuth');
const {authenticateSystem} = require('../middleware/auth/systemAuth');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

// Middleware to allow either system or user authentication (no admin)
const authenticateEither = (req, res, next) => {
  // Check for system auth first
  const systemKey = req.headers['x-housetabz-service-key'];
  if (systemKey === process.env.SYSTEM_API_KEY) {
    req.isSystemRequest = true;
    return next();
  }

  // If no system key, require user authentication
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Valid authentication token or system key required' 
    });
  }

  // Use user authentication
  authenticateUser(req, res, next);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Bill:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Internet Bill"
 *         amount:
 *           type: number
 *           format: float
 *           example: 89.99
 *         status:
 *           type: string
 *           enum: [pending, partial_paid, paid]
 *           example: "pending"
 *         billType:
 *           type: string
 *           enum: [regular, fixed_recurring, variable_recurring]
 *           example: "regular"
 *         dueDate:
 *           type: string
 *           format: date
 *           example: "2025-03-01"
 *     Charge:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 2
 *         amount:
 *           type: number
 *           format: float
 *           example: 29.99
 *         status:
 *           type: string
 *           enum: [pending, paid]
 *           example: "pending"
 */

// System-only routes
router.post('/:houseId/bills', authenticateSystem, catchAsync(billController.createBill));
router.post('/:houseId/generate-fixed-bills', authenticateSystem, catchAsync(billController.generateFixedBills));
router.post('/generate-variable-reminders', authenticateSystem, catchAsync(billController.generateVariableReminders));
router.patch(
  '/:billId/mark-provider-paid',
  authenticateAdmin,
  catchAsync(billController.markProviderPaid)
);

// Routes that support both user and admin access
router.get('/:houseId/bills', authenticateEither, catchAsync(billController.getBillsForHouse));
router.get('/:houseId/paid-bills', authenticateEither, catchAsync(billController.getPaidBillsForHouse));
router.get('/:houseId/bills/:billId', authenticateEither, catchAsync(billController.getBillForHouse));

// User-only routes
router.get('/user/variable-services', authenticateUser, catchAsync(billController.getUserVariableServices));
router.post('/services/:serviceId/submit-bill', authenticateUser, catchAsync(billController.submitVariableBillAmount));

module.exports = router;
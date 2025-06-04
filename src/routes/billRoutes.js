// src/routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const {authenticateSystem} = require('../middleware/auth/systemAuth');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { authenticateAdmin } = require('../middleware/auth/adminAuth'); // 👈 ADD THIS
const { catchAsync } = require('../middleware/errorHandler');

// Updated middleware to allow system, user, OR admin authentication
const authenticateEither = (req, res, next) => {
  // Check for system auth first
  const systemKey = req.headers['x-housetabz-service-key'];
  if (systemKey === process.env.SYSTEM_API_KEY) {
    req.isSystemRequest = true;
    return next();
  }

  // Check for admin or user token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Valid authentication token or system key required' 
    });
  }

  // Try admin auth first, then fall back to user auth
  authenticateAdmin(req, res, (adminErr) => {
    if (!adminErr) {
      // Admin auth succeeded
      return next();
    }
    
    // Admin auth failed, try user auth
    authenticateUser(req, res, (userErr) => {
      if (userErr) {
        // Both admin and user auth failed
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid user, admin token, or system key required' 
        });
      }
      // User auth succeeded
      next();
    });
  });
};

// Your existing Swagger documentation stays the same...

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

// All your existing routes stay exactly the same, they'll just work with admin auth now:

router.post('/:houseId/bills', authenticateSystem, catchAsync(billController.createBill));

// 👈 These routes now support admin auth automatically through the updated authenticateEither
router.get('/:houseId/bills', authenticateEither, catchAsync(billController.getBillsForHouse));
router.get('/:houseId/paid-bills', authenticateEither, catchAsync(billController.getPaidBillsForHouse));
router.get('/:houseId/bills/:billId', authenticateEither, catchAsync(billController.getBillForHouse));

router.post('/:houseId/generate-fixed-bills', authenticateSystem, catchAsync(billController.generateFixedBills));
router.get('/user/variable-services', authenticateUser, catchAsync(billController.getUserVariableServices));
router.post('/services/:serviceId/submit-bill', authenticateUser, catchAsync(billController.submitVariableBillAmount));
router.post('/generate-variable-reminders', authenticateSystem, catchAsync(billController.generateVariableReminders));


module.exports = router;
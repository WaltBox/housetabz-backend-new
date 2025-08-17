// src/routes/paymentHealthRoutes.js
const express = require('express');
const router = express.Router();
const { getPaymentSystemHealth } = require('../middleware/paymentOptimization');
const { authenticateUser } = require('../middleware/auth/userAuth');

// Payment system health check endpoint
router.get('/health', authenticateUser, (req, res) => {
  try {
    const health = getPaymentSystemHealth();
    
    // Determine overall health status
    const isHealthy = 
      health.circuitBreaker.state === 'CLOSED' &&
      health.database.used / health.database.max < 0.8 &&
      health.cache.hitRate > 0.3;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      ...health
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Payment health check failed',
      error: error.message
    });
  }
});

module.exports = router;
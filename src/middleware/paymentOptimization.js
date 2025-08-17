const NodeCache = require('node-cache');
const { sequelize } = require('../models');

// Payment-specific cache with shorter TTL for financial data
const paymentCache = new NodeCache({ 
  stdTTL: 30, // 30 seconds for payment data
  checkperiod: 60,
  useClones: false 
});

// Circuit breaker for payment endpoints
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - too many payment failures');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

const paymentCircuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30s timeout

// Payment method caching middleware
const cachePaymentMethods = (req, res, next) => {
  const userId = req.params.userId || req.user?.id;
  if (!userId) return next();

  const cacheKey = `payment_methods_${userId}`;
  const cached = paymentCache.get(cacheKey);
  
  if (cached) {
    console.log(`💾 Payment methods cache HIT for user ${userId}`);
    return res.json(cached);
  }

  // Store original res.json
  const originalJson = res.json;
  res.json = function(data) {
    // Cache successful responses only
    if (res.statusCode === 200 && data) {
      paymentCache.set(cacheKey, data);
      console.log(`💾 Payment methods cached for user ${userId}`);
    }
    originalJson.call(this, data);
  };

  next();
};

// Charge data caching middleware
const cacheCharges = (req, res, next) => {
  const userId = req.params.userId || req.user?.id;
  const chargeType = req.path.includes('unpaid') ? 'unpaid' : req.path.includes('paid') ? 'paid' : 'all';
  
  if (!userId) return next();

  const cacheKey = `charges_${userId}_${chargeType}`;
  const cached = paymentCache.get(cacheKey);
  
  if (cached) {
    console.log(`💾 Charges cache HIT for user ${userId} (${chargeType})`);
    return res.json(cached);
  }

  // Store original res.json
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode === 200 && data) {
      paymentCache.set(cacheKey, data);
      console.log(`💾 Charges cached for user ${userId} (${chargeType})`);
    }
    originalJson.call(this, data);
  };

  next();
};

// Payment connection pool middleware
const optimizePaymentConnection = async (req, res, next) => {
  // For payment-critical endpoints, ensure we have a good connection
  if (req.path.includes('/payment-methods') || 
      req.path.includes('/charges') || 
      req.path.includes('/dashboard')) {
    
    try {
      // Test connection health before proceeding
      await sequelize.authenticate();
      next();
    } catch (error) {
      console.error('🔴 Payment connection health check failed:', error.message);
      res.status(503).json({ 
        error: 'Payment service temporarily unavailable',
        retry: true 
      });
    }
  } else {
    next();
  }
};

// Performance monitoring middleware
const monitorPaymentPerformance = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  // Store original res.json
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to ms
    
    // Log slow payment operations
    if (duration > 1000) { // > 1 second
      console.warn(`⚠️  SLOW PAYMENT OPERATION: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    } else if (duration > 500) { // > 500ms
      console.log(`⏱️  Payment operation: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    }
    
    originalJson.call(this, data);
  };

  next();
};

// Cache invalidation utilities
const invalidateUserPaymentCache = (userId) => {
  const keys = [
    `payment_methods_${userId}`,
    `charges_${userId}_all`,
    `charges_${userId}_paid`,
    `charges_${userId}_unpaid`
  ];
  
  keys.forEach(key => {
    if (paymentCache.del(key)) {
      console.log(`🗑️  Invalidated payment cache: ${key}`);
    }
  });
};

const invalidateHousePaymentCache = (houseId) => {
  // Get all cache keys and find house-related ones
  const allKeys = paymentCache.keys();
  const houseKeys = allKeys.filter(key => key.includes(`house_${houseId}`));
  
  houseKeys.forEach(key => {
    if (paymentCache.del(key)) {
      console.log(`🗑️  Invalidated house payment cache: ${key}`);
    }
  });
};

// Payment health check endpoint
const getPaymentSystemHealth = () => {
  const stats = paymentCache.getStats();
  
  let databaseStats = {};
  try {
    const pool = sequelize.connectionManager.pool;
    databaseStats = {
      used: pool.used || 0,
      available: pool.available || 0,
      pending: pool.pending || 0,
      max: pool.max || 10,
      min: pool.min || 2,
      size: pool.size || 0
    };
  } catch (error) {
    databaseStats = { error: 'Unable to fetch pool stats' };
  }
  
  return {
    cache: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0
    },
    circuitBreaker: {
      state: paymentCircuitBreaker.state,
      failures: paymentCircuitBreaker.failureCount
    },
    database: databaseStats
  };
};

module.exports = {
  cachePaymentMethods,
  cacheCharges,
  optimizePaymentConnection,
  monitorPaymentPerformance,
  paymentCircuitBreaker,
  invalidateUserPaymentCache,
  invalidateHousePaymentCache,
  getPaymentSystemHealth
};
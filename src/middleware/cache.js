const { createLogger } = require('../utils/logger');
const logger = createLogger('cache-middleware');

/**
 * Simple in-memory cache for HouseTabz backend
 * Suitable for single-server deployments
 * For multi-server setups, consider Redis
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key, value, ttlSeconds = 300) {
    const expires = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null;
    
    this.cache.set(key, {
      value,
      expires,
      createdAt: Date.now()
    });
    
    this.stats.sets++;
  }

  /**
   * Delete specific key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.stats.deletes += this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    logger.info(`Invalidated ${invalidated} cache entries matching pattern: ${pattern}`);
    return invalidated;
  }
}

// Create singleton cache instance
const cacheManager = new CacheManager();

/**
 * Cache configurations for different data types
 */
const cacheConfigs = {
  dashboard: { ttl: 60 }, // 1 minute
  houseFinancial: { ttl: 120 }, // 2 minutes
  hsi: { ttl: 300 }, // 5 minutes (HSI calculations are expensive)
  ledger: { ttl: 180 }, // 3 minutes (ledger calculations are complex)
  bills: { ttl: 30 }, // 30 seconds (bills change frequently)
  userFinance: { ttl: 30 }, // 30 seconds
  tasks: { ttl: 60 }, // 1 minute
  notifications: { ttl: 15 }, // 15 seconds
  urgentMessages: { ttl: 30 }, // 30 seconds (urgent data)
  billSubmissions: { ttl: 60 }, // 1 minute
  transactions: { ttl: 120 } // 2 minutes
};

/**
 * Cache middleware for API responses
 */
const cacheMiddleware = (cacheType = 'default', keyGenerator = null) => {
  return (req, res, next) => {
    const config = cacheConfigs[cacheType] || { ttl: 300 };
    
    // Generate cache key
    let cacheKey;
    if (keyGenerator && typeof keyGenerator === 'function') {
      cacheKey = keyGenerator(req);
    } else {
      cacheKey = `${cacheType}:${req.method}:${req.originalUrl}`;
    }
    
    // Try to get from cache
    const cachedResponse = cacheManager.get(cacheKey);
    
    if (cachedResponse) {
      logger.debug(`Cache hit for key: ${cacheKey}`);
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cachedResponse);
    }
    
    // Cache miss - store original json method
    const originalJson = res.json;
    
    res.json = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheManager.set(cacheKey, body, config.ttl);
        logger.debug(`Cached response for key: ${cacheKey} (TTL: ${config.ttl}s)`);
      }
      
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Cache invalidation helpers
 */
const cacheInvalidators = {
  /**
   * Invalidate user-related cache entries
   */
  user: (userId) => {
    cacheManager.invalidatePattern(`dashboard:.*user/${userId}`);
    cacheManager.invalidatePattern(`userFinance:.*user/${userId}`);
    cacheManager.invalidatePattern(`tasks:.*user/${userId}`);
    cacheManager.invalidatePattern(`notifications:.*user/${userId}`);
    cacheManager.invalidatePattern(`urgentMessages:.*user/${userId}`);
    cacheManager.invalidatePattern(`billSubmissions:.*user/${userId}`);
  },

  /**
   * Invalidate house-related cache entries
   */
  house: (houseId) => {
    cacheManager.invalidatePattern(`houseFinancial:.*house/${houseId}`);
    cacheManager.invalidatePattern(`hsi:.*house/${houseId}`);
    cacheManager.invalidatePattern(`ledger:.*house/${houseId}`);
    cacheManager.invalidatePattern(`bills:.*house/${houseId}`);
  },

  /**
   * Invalidate bill-related cache entries
   */
  bill: (billId, houseId) => {
    cacheManager.invalidatePattern(`bills:.*bill/${billId}`);
    if (houseId) {
      cacheManager.invalidatePattern(`bills:.*house/${houseId}`);
      cacheManager.invalidatePattern(`houseFinancial:.*house/${houseId}`);
    }
  },

  /**
   * Invalidate HSI-related cache entries
   */
  hsi: (houseId) => {
    cacheManager.invalidatePattern(`hsi:.*house/${houseId}`);
    cacheManager.invalidatePattern(`houseFinancial:.*house/${houseId}`);
    cacheManager.invalidatePattern(`dashboard:.*house/${houseId}`);
  },

  /**
   * Invalidate ledger-related cache entries
   */
  ledger: (houseServiceId, houseId) => {
    cacheManager.invalidatePattern(`ledger:.*service/${houseServiceId}`);
    if (houseId) {
      cacheManager.invalidatePattern(`ledger:.*house/${houseId}`);
      cacheManager.invalidatePattern(`houseFinancial:.*house/${houseId}`);
    }
  }
};

/**
 * Key generators for different cache types
 */
const keyGenerators = {
  dashboard: (req) => {
    const userId = req.params.userId || req.user?.id;
    return `dashboard:user/${userId}`;
  },
  
  houseFinancial: (req) => {
    const houseId = req.params.houseId;
    return `houseFinancial:house/${houseId}`;
  },
  
  hsi: (req) => {
    const houseId = req.params.houseId;
    return `hsi:house/${houseId}`;
  },
  
  ledger: (req) => {
    const houseServiceId = req.params.houseServiceId;
    return `ledger:service/${houseServiceId}`;
  },
  
  bills: (req) => {
    const houseId = req.params.houseId;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const status = req.query.status || 'all';
    return `bills:house/${houseId}:page/${page}:limit/${limit}:status/${status}`;
  }
};

/**
 * Cache statistics endpoint data
 */
const getCacheStats = () => {
  return cacheManager.getStats();
};

module.exports = {
  cacheMiddleware,
  cacheManager,
  cacheInvalidators,
  keyGenerators,
  getCacheStats
}; 
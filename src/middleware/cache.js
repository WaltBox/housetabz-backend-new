// src/middleware/cache.js
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // Maximum number of cached items
    this.defaultTTL = 60 * 1000; // 1 minute default TTL
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Global cache instance
const cache = new SimpleCache();

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Function to generate cache key from req
 */
function cacheMiddleware(ttl = 60, keyGenerator = null) {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req)
      : `${req.originalUrl}-${req.user?.id || 'anon'}`;
    
    // Try to get cached response
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      // Set cache hit header
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(key, data, ttl * 1000);
        res.set('X-Cache', 'MISS');
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Cache invalidation helper
 * @param {string} pattern - Pattern to match keys for invalidation
 */
function invalidateCache(pattern) {
  if (typeof pattern === 'string') {
    cache.delete(pattern);
  } else if (pattern instanceof RegExp) {
    for (const key of cache.cache.keys()) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Cache specific endpoints with custom TTL
 */
const cacheConfigs = {
  dashboard: cacheMiddleware(60, (req) => `dashboard-${req.user?.id}-${req.user?.houseId}`),
  bills: cacheMiddleware(30, (req) => `bills-${req.params.houseId}-${req.query.page || 1}`),
  houseServices: cacheMiddleware(120, (req) => `services-${req.params.houseId}`),
  userFinance: cacheMiddleware(30, (req) => `finance-${req.user?.id}`)
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  cacheConfigs
}; 
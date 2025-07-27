const zlib = require('zlib');
const { createLogger } = require('../utils/logger');
const logger = createLogger('optimization-middleware');

/**
 * Gzip compression middleware for responses
 * Compresses responses larger than 1KB
 */
const compressionMiddleware = (options = {}) => {
  const {
    threshold = 1024, // 1KB minimum
    level = 6, // compression level 1-9
    filter = (req, res) => {
      // Don't compress if response is already compressed
      if (res.get('content-encoding')) {
        return false;
      }
      
      // Don't compress images, videos, or already compressed content
      const contentType = res.get('content-type') || '';
      if (contentType.includes('image/') || 
          contentType.includes('video/') || 
          contentType.includes('audio/') ||
          contentType.includes('application/zip') ||
          contentType.includes('application/gzip')) {
        return false;
      }
      
      return true;
    }
  } = options;

  return (req, res, next) => {
    // Check if client accepts gzip
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const supportsGzip = acceptEncoding.includes('gzip');
    
    if (!supportsGzip) {
      return next();
    }

    // Store original json method
    const originalJson = res.json;
    
    res.json = function(body) {
      if (!filter(req, res)) {
        return originalJson.call(this, body);
      }
      
      const jsonString = JSON.stringify(body);
      
      // Only compress if larger than threshold
      if (jsonString.length < threshold) {
        return originalJson.call(this, body);
      }
      
      // Compress the response
      zlib.gzip(jsonString, { level }, (err, compressed) => {
        if (err) {
          logger.error('Compression error:', err);
          return originalJson.call(this, body);
        }
        
        const compressionRatio = compressed.length / jsonString.length;
        
        res.set({
          'Content-Encoding': 'gzip',
          'Content-Length': compressed.length,
          'X-Compression-Ratio': compressionRatio.toFixed(3),
          'X-Original-Size': jsonString.length,
          'X-Compressed-Size': compressed.length
        });
        
        logger.debug(`Compressed response: ${jsonString.length} -> ${compressed.length} bytes (${(compressionRatio * 100).toFixed(1)}%)`);
        
        res.end(compressed);
      });
    };
    
    next();
  };
};

/**
 * Field selection middleware
 * Allows clients to specify which fields they want in the response
 * Usage: ?fields=id,name,amount or ?fields=user.id,user.name,house.name
 */
const fieldSelectionMiddleware = (req, res, next) => {
  const fields = req.query.fields;
  
  if (!fields) {
    return next();
  }
  
  const requestedFields = fields.split(',').map(f => f.trim());
  
  // Store original json method
  const originalJson = res.json;
  
  res.json = function(body) {
    if (!body || typeof body !== 'object') {
      return originalJson.call(this, body);
    }
    
    try {
      const filteredBody = filterFields(body, requestedFields);
      res.set('X-Fields-Selected', requestedFields.join(','));
      res.set('X-Field-Selection', 'active');
      return originalJson.call(this, filteredBody);
    } catch (error) {
      logger.error('Field selection error:', error);
      return originalJson.call(this, body);
    }
  };
  
  next();
};

/**
 * Recursively filter object fields based on requested fields
 */
function filterFields(obj, fields) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterFields(item, fields));
  }
  
  const result = {};
  
  for (const field of fields) {
    if (field.includes('.')) {
      // Nested field like 'user.name'
      const [parent, ...childPath] = field.split('.');
      const childField = childPath.join('.');
      
      if (obj[parent] && !result[parent]) {
        result[parent] = {};
      }
      
      if (obj[parent]) {
        const childResult = filterFields(obj[parent], [childField]);
        Object.assign(result[parent], childResult);
      }
    } else {
      // Direct field
      if (obj.hasOwnProperty(field)) {
        result[field] = obj[field];
      }
    }
  }
  
  return result;
}

/**
 * Pagination middleware
 * Standardizes pagination across endpoints
 */
const paginationMiddleware = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit) || defaultLimit));
    const offset = (page - 1) * limit;
    
    // Add pagination info to request
    req.pagination = {
      page,
      limit,
      offset
    };
    
    // Store original json method to add pagination metadata
    const originalJson = res.json;
    
    res.json = function(body) {
      if (body && typeof body === 'object' && body.data && Array.isArray(body.data)) {
        const totalItems = body.total || body.data.length;
        const totalPages = Math.ceil(totalItems / limit);
        
        const paginatedResponse = {
          ...body,
          pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
          }
        };
        
        res.set({
          'X-Pagination-Page': page,
          'X-Pagination-Limit': limit,
          'X-Pagination-Total': totalItems,
          'X-Pagination-Pages': totalPages
        });
        
        return originalJson.call(this, paginatedResponse);
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Response timing middleware
 * Adds response time headers and logs slow requests
 */
const responseTimingMiddleware = (slowThreshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Store original json method
    const originalJson = res.json;
    
    res.json = function(body) {
      const responseTime = Date.now() - startTime;
      
      res.set({
        'X-Response-Time': `${responseTime}ms`,
        'X-Request-ID': req.headers['x-request-id'] || `req-${Date.now()}`,
        'X-Timestamp': new Date().toISOString()
      });
      
      // Log slow requests
      if (responseTime > slowThreshold) {
        logger.warn(`Slow request detected: ${req.method} ${req.originalUrl} - ${responseTime}ms`, {
          method: req.method,
          url: req.originalUrl,
          responseTime,
          userAgent: req.get('user-agent'),
          ip: req.ip
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Performance monitoring middleware
 * Collects performance metrics for analysis
 */
const performanceMonitoringMiddleware = () => {
  const metrics = {
    requests: 0,
    totalResponseTime: 0,
    slowRequests: 0,
    routes: new Map()
  };
  
  return (req, res, next) => {
    const startTime = Date.now();
    metrics.requests++;
    
    const originalJson = res.json;
    
    res.json = function(body) {
      const responseTime = Date.now() - startTime;
      metrics.totalResponseTime += responseTime;
      
      if (responseTime > 1000) {
        metrics.slowRequests++;
      }
      
      // Track per-route metrics
      const route = `${req.method} ${req.route?.path || req.originalUrl}`;
      const routeMetrics = metrics.routes.get(route) || { count: 0, totalTime: 0 };
      routeMetrics.count++;
      routeMetrics.totalTime += responseTime;
      metrics.routes.set(route, routeMetrics);
      
      // Add performance headers
      res.set({
        'X-Avg-Response-Time': `${Math.round(metrics.totalResponseTime / metrics.requests)}ms`,
        'X-Request-Count': metrics.requests,
        'X-Slow-Request-Rate': `${((metrics.slowRequests / metrics.requests) * 100).toFixed(1)}%`
      });
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Get performance metrics
 */
const getPerformanceMetrics = () => {
  return {
    requests: metrics.requests,
    averageResponseTime: metrics.requests > 0 ? Math.round(metrics.totalResponseTime / metrics.requests) : 0,
    slowRequests: metrics.slowRequests,
    slowRequestRate: metrics.requests > 0 ? ((metrics.slowRequests / metrics.requests) * 100).toFixed(1) : 0,
    routes: Array.from(metrics.routes.entries()).map(([route, data]) => ({
      route,
      count: data.count,
      averageTime: Math.round(data.totalTime / data.count)
    })).sort((a, b) => b.averageTime - a.averageTime)
  };
};

/**
 * Combined optimization middleware
 * Applies all optimization middlewares in the correct order
 */
const optimizationMiddleware = (options = {}) => {
  const {
    compression = true,
    fieldSelection = true,
    pagination = true,
    timing = true,
    monitoring = true,
    compressionOptions = {},
    paginationOptions = { defaultLimit: 20, maxLimit: 100 }
  } = options;
  
  return (req, res, next) => {
    const middlewares = [];
    
    if (timing) middlewares.push(responseTimingMiddleware());
    if (monitoring) middlewares.push(performanceMonitoringMiddleware());
    if (fieldSelection) middlewares.push(fieldSelectionMiddleware);
    if (pagination) middlewares.push(paginationMiddleware(paginationOptions.defaultLimit, paginationOptions.maxLimit));
    if (compression) middlewares.push(compressionMiddleware(compressionOptions));
    
    // Apply middlewares in sequence
    let index = 0;
    
    const runNext = () => {
      if (index >= middlewares.length) {
        return next();
      }
      
      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    };
    
    runNext();
  };
};

module.exports = {
  compressionMiddleware,
  fieldSelectionMiddleware,
  paginationMiddleware,
  responseTimingMiddleware,
  performanceMonitoringMiddleware,
  optimizationMiddleware,
  getPerformanceMetrics
}; 
const zlib = require('zlib');

/**
 * Simple response compression middleware
 * Compresses JSON responses to reduce bandwidth
 */
function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Skip compression for small responses or if client doesn't support it
  if (!acceptEncoding.includes('gzip')) {
    return next();
  }
  
  // Override res.json to add compression
  const originalJson = res.json;
  res.json = function(data) {
    const jsonString = JSON.stringify(data);
    
    // Only compress larger responses (> 1KB)
    if (jsonString.length > 1024) {
      res.set({
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json'
      });
      
      const compressed = zlib.gzipSync(jsonString);
      return res.send(compressed);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Field selection middleware for API responses
 * Allows clients to specify which fields they want: ?fields=id,name,amount
 */
function fieldSelectionMiddleware(req, res, next) {
  const fields = req.query.fields;
  
  if (!fields) {
    return next();
  }
  
  const selectedFields = fields.split(',').map(f => f.trim());
  
  // Override res.json to filter fields
  const originalJson = res.json;
  res.json = function(data) {
    if (data && typeof data === 'object') {
      const filteredData = filterFields(data, selectedFields);
      return originalJson.call(this, filteredData);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Recursively filter object fields
 */
function filterFields(data, fields) {
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fields));
  }
  
  if (data && typeof data === 'object') {
    const filtered = {};
    for (const field of fields) {
      if (field.includes('.')) {
        // Handle nested fields like 'user.name'
        const [parent, child] = field.split('.');
        if (data[parent]) {
          filtered[parent] = filtered[parent] || {};
          if (data[parent][child] !== undefined) {
            filtered[parent][child] = data[parent][child];
          }
        }
      } else if (data[field] !== undefined) {
        filtered[field] = data[field];
      }
    }
    return filtered;
  }
  
  return data;
}

/**
 * Response timing middleware
 * Adds response time headers for monitoring
 */
function responseTimingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.set('X-Response-Time', `${duration}ms`);
  });
  
  next();
}

/**
 * Pagination helper middleware
 * Standardizes pagination across endpoints
 */
function paginationMiddleware(req, res, next) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20)); // Max 100, min 1
  const offset = (page - 1) * limit;
  
  req.pagination = {
    page,
    limit,
    offset,
    createResponse: (data, totalCount) => ({
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      }
    })
  };
  
  next();
}

/**
 * API versioning middleware
 * Handles API version headers
 */
function versioningMiddleware(req, res, next) {
  const version = req.headers['api-version'] || req.query.v || '1';
  req.apiVersion = version;
  res.set('API-Version', version);
  next();
}

/**
 * Request logging middleware for performance monitoring
 */
function performanceLoggingMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms, Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Add headers for monitoring
    res.set({
      'X-Response-Time': `${duration.toFixed(2)}ms`,
      'X-Memory-Delta': `${(memoryDelta / 1024).toFixed(2)}KB`
    });
  });
  
  next();
}

module.exports = {
  compressionMiddleware,
  fieldSelectionMiddleware,
  responseTimingMiddleware,
  paginationMiddleware,
  versioningMiddleware,
  performanceLoggingMiddleware
}; 
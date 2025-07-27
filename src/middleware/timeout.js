module.exports = (timeoutMs = 30000) => {
  return (req, res, next) => {
    // Set timeout for the request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.log(`Request timeout: ${req.method} ${req.url} - ${timeoutMs}ms`);
        res.status(504).json({ 
          error: 'Request timeout', 
          timeout: timeoutMs,
          path: req.url
        });
      }
    }, timeoutMs);
    
    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    // Clear timeout on error
    res.on('error', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
}; 
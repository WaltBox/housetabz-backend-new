// src/utils/logger.js
// Simple logger utility without external dependencies

function createLogger(label = 'app') {
  return {
    info: (msg, ...args) => console.log(`[${label}] INFO:`, msg, ...args),
    error: (msg, ...args) => console.error(`[${label}] ERROR:`, msg, ...args),
    warn: (msg, ...args) => console.warn(`[${label}] WARN:`, msg, ...args),
    debug: (msg, ...args) => console.debug(`[${label}] DEBUG:`, msg, ...args)
  };
}

module.exports = { createLogger };
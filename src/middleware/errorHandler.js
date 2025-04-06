// Custom error class for operational errors
class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true; // Flag for operational errors
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Global error handling middleware
  const errorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error('Error:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      path: req.path,
      method: req.method
    });
  
    // Default error status and message
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Something went wrong';
    
    // Handle JWT specific errors
    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    }
  
    // Handle Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
      statusCode = 400;
      message = err.errors.map(e => e.message).join(', ');
    }
    
    // Handle Sequelize database errors
    if (err.name === 'SequelizeDatabaseError') {
      statusCode = 500;
      message = 'Database error occurred';
    }
  
    // Hide error details in production
    const errorResponse = {
      error: statusCode >= 500 && process.env.NODE_ENV === 'production' 
        ? 'Server error' 
        : message
    };
  
    // Include stack trace in development environment
    if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
      errorResponse.stack = err.stack;
    }
  
    res.status(statusCode).json(errorResponse);
  };
  
  // Utility to handle async route errors
  const catchAsync = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  module.exports = {
    AppError,
    errorHandler,
    catchAsync
  };
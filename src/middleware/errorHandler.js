class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  const errorHandler = (err, req, res, next) => {
    if (!err.isOperational) {
      console.error('Unexpected Error:', err);
      return res.status(500).json({ message: 'Something went wrong!' });
    }
  
    res.status(err.statusCode || 500).json({
      message: err.message || 'Something went wrong!',
    });
  };
  
  module.exports = { AppError, errorHandler };
  
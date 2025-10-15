const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error(`${err.status} ${err.statusCode}: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  // Send error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Async function wrapper to avoid try-catch blocks
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Process level unhandled rejection and exceptions
const setupProcessErrorHandlers = () => {
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    
    // Graceful shutdown after logging
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    
    // Uncaught exceptions are serious - exit immediately
    process.exit(1);
  });
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  setupProcessErrorHandlers,
};
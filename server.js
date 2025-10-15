const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const config = require('./config/config');
const { errorHandler, setupProcessErrorHandlers } = require('./utils/errorHandler');
const whatsappService = require('./services/whatsappService');

// Set up process error handlers for uncaught exceptions
setupProcessErrorHandlers();

// Import route handlers
const indexRoutes = require('./routes/index');
const whatsappRoutes = require('./routes/whatsapp');

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Route handlers
app.use('/', indexRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 404 Not Found handler
app.all('*', (req, res, next) => {
  const err = new Error(`Cannot find ${req.originalUrl} on this server!`);
  err.statusCode = 404;
  next(err);
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, async () => {
  logger.info(`Server is running on port ${PORT} in ${config.server.environment} mode`);
  
  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongo.uri);
    logger.info('MongoDB connection successful');
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
  }

  // Initialize WhatsApp client
  try {
    await whatsappService.connect();
    logger.info('WhatsApp client initialization initiated');
  } catch (err) {
    logger.error(`WhatsApp client initialization error: ${err.message}`);
  }
});

// Handle server shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  // Close server
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Destroy WhatsApp client
    try {
      if (whatsappService.isInitialized) {
        await whatsappService.destroy();
      }
    } catch (err) {
      logger.error(`Error destroying WhatsApp client: ${err.message}`);
    }
    
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error(`Error closing MongoDB connection: ${err.message}`);
      process.exit(1);
    }
  });
});

module.exports = app;
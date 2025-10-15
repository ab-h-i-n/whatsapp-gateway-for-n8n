const express = require('express');
const { catchAsync } = require('../utils/errorHandler');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const config = require('../config/config');
const router = express.Router();

/**
 * @route   GET /api/whatsapp/status
 * @desc    Get WhatsApp client status
 * @access  Public
 */
router.get('/status', catchAsync(async (req, res) => {
  const status = await whatsappService.getState();
  res.status(200).json({ 
    success: true, 
    data: status 
  });
}));

/**
 * @route   POST /api/whatsapp/initialize
 * @desc    Initialize WhatsApp client
 * @access  Public
 */
router.post('/initialize', catchAsync(async (req, res) => {
  logger.info('Initializing WhatsApp client');
  await whatsappService.connect();
  res.status(200).json({ 
    success: true, 
    message: 'WhatsApp client initialized successfully' 
  });
}));

/**
 * @route   POST /api/whatsapp/send
 * @desc    Send WhatsApp message
 * @access  Public
 */
router.post('/send', catchAsync(async (req, res) => {
  const { message, title, to, priority } = req.body;
  
  // Validate input
  if (!message || !title) {
    throw new AppError('Title and message are required fields', 400);
  }
  
  // Format message
  let content = `*${title}*\n\n${message}`;
  
  // Use default recipient if not provided
  const recipient = to || config.notifications.adminNumber;
  
  // Additional options
  const options = {
    priority: priority || 'normal' // Can be 'high', 'normal', 'low'
  };
  
  // Send message (queued)
  logger.info(`Queuing message to ${recipient}`);
  await whatsappService.connect(); // Ensure client is initialized
  
  const result = await whatsappService.sendMessage(recipient, content, options);
  
  res.status(200).json({ 
    success: true, 
    message: 'Message queued successfully',
    data: result
  });
}));

/**
 * @route   POST /api/whatsapp/destroy
 * @desc    Destroy WhatsApp client
 * @access  Public
 */
router.post('/destroy', catchAsync(async (req, res) => {
  const result = await whatsappService.destroy();
  
  res.status(200).json({ 
    success: true, 
    message: result ? 'Client destroyed successfully' : 'Client was not initialized' 
  });
}));

/**
 * @route   GET /api/whatsapp/queue
 * @desc    Get message queue status
 * @access  Public
 */
router.get('/queue', catchAsync(async (req, res) => {
  const queueStats = whatsappService.getQueueStats();
  
  res.status(200).json({ 
    success: true, 
    data: queueStats
  });
}));

/**
 * @route   POST /api/whatsapp/logout
 * @desc    Logout from WhatsApp Web session
 * @access  Public
 */
router.post('/logout', catchAsync(async (req, res) => {
  logger.info('User initiated logout from WhatsApp');
  
  try {
    const result = await whatsappService.logout();
    
    if (result) {
      res.status(200).json({
        success: true,
        message: 'Successfully logged out of WhatsApp'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Not currently logged in to WhatsApp'
      });
    }
  } catch (error) {
    logger.error(`Logout failed: ${error.message}`);
    throw new AppError(`Logout failed: ${error.message}`, 500);
  }
}));

/**
 * @route   DELETE /api/whatsapp/queue
 * @desc    Clear message queue
 * @access  Public
 */
router.delete('/queue', catchAsync(async (req, res) => {
  const clearedCount = whatsappService.clearQueue();
  
  res.status(200).json({ 
    success: true, 
    message: `Cleared ${clearedCount} messages from queue`
  });
}));

module.exports = router;
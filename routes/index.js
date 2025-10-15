const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { catchAsync } = require('../utils/errorHandler');

/**
 * @route   GET /
 * @desc    Root page - serves QR code or status
 * @access  Public
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'qr.html'));
});

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'up', 
    timestamp: new Date().toISOString() 
  });
});

/**
 * @route   GET /version
 * @desc    Get application version
 * @access  Public
 */
router.get('/version', catchAsync(async (req, res) => {
  // Read package.json for version
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
  
  res.status(200).json({ 
    version: packageJson.version,
    name: packageJson.name
  });
}));

module.exports = router;
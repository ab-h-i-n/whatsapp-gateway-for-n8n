const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
  },
  
  // MongoDB configuration
  mongo: {
    uri: process.env.MONGODB_URI,
    options: {
      // MongoDB driver 4.0+ no longer needs these options
    }
  },
  
  // WhatsApp client configuration
  whatsapp: {
    sessionArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // <- this one doesn't works in Windows
      "--disable-gpu"
    ],
    puppeteerOptions: {
      headless: true, // Use false for development to see the browser
    },
    backupSyncIntervalMs: 300000, // 5 minutes
    clientLifetime: process.env.CLIENT_LIFETIME || 5 * 60 * 1000, // Default 5 minutes
  },
  
  // Notification settings
  notifications: {
    adminNumber: process.env.ADMIN_PHONE ,
    webhookUrl: process.env.WEBHOOK_URL
  },
  
  // Message queue configuration
  queue: {
    messageDelay: process.env.MESSAGE_DELAY || 1000, // Delay between messages in ms
    maxRetries: process.env.MAX_RETRIES || 3, // Maximum retry attempts for failed messages
    retryDelay: process.env.RETRY_DELAY || 5000, // Delay between retries in ms
    concurrency: process.env.QUEUE_CONCURRENCY || 1, // Number of concurrent messages to process
  }
};

module.exports = config;
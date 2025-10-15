const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const fs = require('fs');
const qrCode = require('qrcode');
const config = require('../config/config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const messageQueue = require('../utils/messageQueue');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async connect() {
    // If already initializing, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create a new initialization promise
    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  async _initialize() {
    try {
      // Connect to MongoDB
      if (!mongoose.connection.readyState) {
        await mongoose.connect(config.mongo.uri, config.mongo.options);
        logger.info('Connected to MongoDB');
      }

      const store = new MongoStore({ mongoose: mongoose });

      // Create client with config options
      this.client = new Client({
        puppeteer: {
          headless: config.whatsapp.puppeteerOptions.headless,
          args: config.whatsapp.sessionArgs,
          executablePath: config.whatsapp.puppeteerOptions.executablePath,
          // Adding more puppeteer options for stability
          defaultViewport: null,
          timeout: 0, // Disable timeout
        },
        authStrategy: new RemoteAuth({
          store: store,
          backupSyncIntervalMs: config.whatsapp.backupSyncIntervalMs,
        }),
      });

      // Set up event handlers
      this._setupEventHandlers();

      // Initialize the client
      await this.client.initialize();
      logger.info('WhatsApp client initialization started');

      // Set client lifetime
      this._setupClientLifetime();

      // Wait for client to be ready
      await new Promise((resolve, reject) => {
        this.client.once('ready', resolve);
        this.client.once('auth_failure', (error) => reject(new Error(`Authentication failed: ${error}`)));

        // Add timeout for initialization
        const timeout = setTimeout(() => {
          reject(new Error('Client initialization timed out'));
        }, 120000); // 2 minutes timeout

        // Clear timeout if resolved or rejected
        this.client.once('ready', () => clearTimeout(timeout));
        this.client.once('auth_failure', () => clearTimeout(timeout));
      });

      this.isInitialized = true;
      return this.client;
    } catch (error) {
      logger.error(`Failed to initialize WhatsApp client: ${error.message}`);
      this.isInitialized = false;
      this.initializationPromise = null;
      throw new AppError(`WhatsApp client initialization failed: ${error.message}`, 500);
    }
  }

  _setupEventHandlers() {
    // Client ready event
    this.client.on('ready', async () => {
      logger.info('WhatsApp client is ready!');
      try {
        const version = await this.client.getWWebVersion();
        logger.info(`WhatsApp Web version: ${version}`);
        this._showReadyHtml();
        
        await this.sendMessage(
          config.notifications.adminNumber, 
          'WhatsApp client is ready!'
        );
      } catch (error) {
        logger.error(`Error in ready event: ${error.message}`);
      }
    });

    // Loading screen event
    this.client.on('loading_screen', () => {
      logger.info('WhatsApp loading screen...');
      this._showLoadingHtml();
    });

    // QR code event
    this.client.on('qr', (qr) => {
      logger.info('WhatsApp QR code received');
      this._createQr(qr);
    });

    // Disconnection event
    this.client.on('disconnected', (reason) => {
      logger.warn(`WhatsApp client was logged out: ${reason}`);
      fs.writeFileSync('qr.html', 'Client was logged out');
      
      // Reset initialization state
      this.isInitialized = false;
      this.initializationPromise = null;
      
      // Don't exit the process, allow reconnection
      // Instead, emit an event that can be handled by the server
      if (this.client) {
        this.client.emit('client_disconnected', reason);
      }
    });

    // Message event
    this.client.on('message', async (msg) => {
      try {
        logger.debug(`Message received from ${msg.from}: ${msg.body.substring(0, 20)}${msg.body.length > 20 ? '...' : ''}`);
        
        // Send to webhook
        await fetch(config.notifications.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: msg.body, from: msg.from }),
        });
      } catch (error) {
        logger.error(`Error sending webhook: ${error.message}`);
      }
    });

    // Authentication failure event
    this.client.on('auth_failure', (error) => {
      logger.error(`WhatsApp authentication failed: ${error}`);
      this.isInitialized = false;
      this.initializationPromise = null;
    });
  }

  _setupClientLifetime() {
    if (config.whatsapp.clientLifetime > 0) {
      setTimeout(async () => {
        try {
          logger.info(`Client lifetime reached (${config.whatsapp.clientLifetime}ms). Destroying client...`);
          
          if (this.isInitialized && this.client) {
            await this.sendMessage(config.notifications.adminNumber, 'Client destroyed due to lifetime limit');
            await this.client.destroy();
            logger.info('Client successfully destroyed');
          }
          
          // Reset initialization state
          this.isInitialized = false;
          this.initializationPromise = null;
        } catch (error) {
          logger.error(`Error destroying client: ${error.message}`);
        }
      }, config.whatsapp.clientLifetime);
    }
  }

  /**
   * Send a message via WhatsApp
   * @param {string} to - Recipient's phone number with @c.us suffix
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise} - Promise that resolves with message info
   */
  async sendMessage(to, message, options = {}) {
    if (!this.isInitialized || !this.client) {
      throw new AppError('WhatsApp client is not initialized', 400);
    }

    // Queue the message sending
    return messageQueue.add(
      async (opts) => {
        try {
          logger.debug(`Sending message to ${opts.to}`);
          const response = await this.client.sendMessage(opts.to, opts.message);
          logger.debug('Message sent successfully');
          return { 
            success: true, 
            messageId: response.id._serialized,
            timestamp: response.timestamp
          };
        } catch (error) {
          logger.error(`Error sending message: ${error.message}`);
          throw new AppError(`Failed to send message: ${error.message}`, 500);
        }
      },
      { to, message, priority: options.priority || 'normal' }
    );
  }

  /**
   * Get message queue status
   * @returns {Object} Queue statistics
   */
  getQueueStats() {
    return messageQueue.getStats();
  }
  
  /**
   * Clear the message queue
   * @returns {number} Number of messages cleared
   */
  clearQueue() {
    return messageQueue.clear();
  }

  async getState() {
    if (!this.client) {
      return { status: 'not_initialized' };
    }
    
    try {
      const state = await this.client.getState();
      return { status: state };
    } catch (error) {
      logger.error(`Error getting client state: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }
  
  /**
   * Logout from the WhatsApp session
   * This keeps the client instance but logs out the current user
   * @returns {Promise<boolean>} True if logout successful, false otherwise
   */
  async logout() {
    if (!this.isInitialized || !this.client) {
      logger.warn('Cannot logout: WhatsApp client is not initialized');
      return false;
    }
    
    try {
      logger.info('Logging out of WhatsApp session');
      await this.client.logout();
      
      // Update the QR HTML to show logged out state
      const html = `
        <html>
          <head>
            <title>WhatsApp Web Status</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
              .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
              .logout { color: #e74c3c; }
              .info { margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="logout">Logged Out</h2>
              <p>You have been logged out of WhatsApp Web.</p>
              <p class="info">To reconnect, please reload this page and scan the QR code with your phone.</p>
              <p><small>Last updated: ${new Date().toLocaleString()}</small></p>
            </div>
          </body>
        </html>
      `;
      fs.writeFileSync('qr.html', html);
      
      // Reset state but keep the client instance
      this.isInitialized = false;
      this.initializationPromise = null;
      
      logger.info('Successfully logged out of WhatsApp');
      return true;
    } catch (error) {
      logger.error(`Error during logout: ${error.message}`);
      throw new AppError(`Failed to logout: ${error.message}`, 500);
    }
  }

  async destroy() {
    if (this.isInitialized && this.client) {
      try {
        await this.client.destroy();
        logger.info('WhatsApp client destroyed');
        
        this.isInitialized = false;
        this.initializationPromise = null;
        return true;
      } catch (error) {
        logger.error(`Error destroying client: ${error.message}`);
        throw new AppError(`Failed to destroy client: ${error.message}`, 500);
      }
    }
    return false;
  }

  // HTML utility methods
  _showReadyHtml() {
    const html = `
      <html>
        <head>
          <title>WhatsApp Web Status</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="success">WhatsApp Client is Ready!</h2>
            <p>You can now send and receive messages.</p>
            <p><small>Last updated: ${new Date().toLocaleString()}</small></p>
          </div>
        </body>
      </html>
    `;
    fs.writeFileSync('qr.html', html);
  }

  _showLoadingHtml() {
    const html = `
      <html>
        <head>
          <title>WhatsApp Web Status</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .loading { color: orange; }
            @keyframes spinner { to {transform: rotate(360deg);} }
            .spinner:before { content: ''; box-sizing: border-box; position: absolute; width: 20px; height: 20px; margin-top: 10px; margin-left: -30px; border-radius: 50%; border: 2px solid #ccc; border-top-color: #000; animation: spinner .6s linear infinite; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="loading"><span class="spinner"></span> Loading WhatsApp...</h2>
            <p>Please wait while we connect to WhatsApp Web.</p>
            <p><small>Last updated: ${new Date().toLocaleString()}</small></p>
          </div>
        </body>
      </html>
    `;
    fs.writeFileSync('qr.html', html);
  }

  _createQr(qr) {
    qrCode.toDataURL(qr, (err, url) => {
      if (err) {
        logger.error(`Error generating QR code: ${err.message}`);
        return;
      }
      const html = `
        <html>
          <head>
            <title>WhatsApp Web QR Code</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
              .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
              img { display: block; margin: 0 auto; max-width: 100%; }
              .instructions { margin-top: 20px; color: #555; }
            </style>
            <meta http-equiv="refresh" content="60">
          </head>
          <body>
            <div class="container">
              <h2>Scan QR Code</h2>
              <img src="${url}" alt="WhatsApp QR Code">
              <p class="instructions">
                Open WhatsApp on your phone<br>
                Tap Menu or Settings and select WhatsApp Web<br>
                Point your phone to this screen to capture the code
              </p>
              <p><small>This QR code will refresh in 60 seconds if not scanned</small></p>
              <p><small>Last updated: ${new Date().toLocaleString()}</small></p>
            </div>
          </body>
        </html>
      `;
      fs.writeFileSync('qr.html', html);
    });
  }
}

// Create and export a singleton instance
const whatsappService = new WhatsAppService();
module.exports = whatsappService;
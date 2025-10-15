const logger = require('./logger');
const { AppError } = require('./errorHandler');
const config = require('../config/config');

/**
 * A simple message queue for handling WhatsApp message sending
 */
class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.messagesSent = 0;
    this.messagesQueued = 0;
    this.messagesFailed = 0;
  }

  /**
   * Add a message to the queue
   * @param {Function} sendFunction - Function that sends the message
   * @param {Object} options - Message options
   * @returns {Promise} Resolves when message is processed
   */
  add(sendFunction, options) {
    this.messagesQueued++;
    
    return new Promise((resolve, reject) => {
      const messageId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      
      logger.info(`Message queued: ID ${messageId} to ${options.to}`);
      
      // Add message to queue
      this.queue.push({
        id: messageId,
        sendFunction,
        options,
        resolve,
        reject,
        attempts: 0,
        addedAt: Date.now()
      });
      
      // Start processing if not already
      if (!this.processing) {
        this.process();
      }
    });
  }

  /**
   * Process messages in queue
   * @private
   */
  async process() {
    // Return if already processing or no items in queue
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    try {
      // Process up to `concurrency` messages at once
      const concurrency = config.queue.concurrency;
      const batch = this.queue.splice(0, concurrency);
      
      if (batch.length > 0) {
        logger.debug(`Processing ${batch.length} messages from queue`);
        
        // Process each message in the batch
        const results = await Promise.allSettled(batch.map(msg => this.processMessage(msg)));
        
        // Log results
        results.forEach((result, i) => {
          const msg = batch[i];
          
          if (result.status === 'fulfilled') {
            logger.debug(`Message ${msg.id} processed successfully`);
            msg.resolve(result.value);
            this.messagesSent++;
          } else {
            logger.error(`Message ${msg.id} failed: ${result.reason}`);
            msg.reject(result.reason);
            this.messagesFailed++;
          }
        });
        
        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, config.queue.messageDelay));
      }
    } catch (error) {
      logger.error(`Error processing message queue: ${error.message}`);
    } finally {
      this.processing = false;
      
      // Continue processing if there are more messages
      if (this.queue.length > 0) {
        this.process();
      }
    }
  }

  /**
   * Process a single message from the queue
   * @private
   * @param {Object} msg - Message object
   * @returns {Promise} Resolves when message is sent
   */
  async processMessage(msg) {
    try {
      msg.attempts++;
      
      const waitTime = Date.now() - msg.addedAt;
      logger.debug(`Processing message ${msg.id} (attempt ${msg.attempts}, waited ${waitTime}ms)`);
      
      // Try to send the message
      const result = await msg.sendFunction(msg.options);
      return result;
    } catch (error) {
      // Retry if under max attempts
      if (msg.attempts < config.queue.maxRetries) {
        logger.warn(`Message ${msg.id} failed, retrying (${msg.attempts}/${config.queue.maxRetries}): ${error.message}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, config.queue.retryDelay));
        
        // Re-add to the front of the queue
        this.queue.unshift(msg);
        return Promise.reject(new AppError(`Message will be retried (${msg.attempts}/${config.queue.maxRetries})`, 500));
      }
      
      // Max retries exceeded
      return Promise.reject(new AppError(`Failed to send message after ${msg.attempts} attempts: ${error.message}`, 500));
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getStats() {
    return {
      queued: this.queue.length,
      sent: this.messagesSent,
      failed: this.messagesFailed,
      total: this.messagesQueued,
      processing: this.processing
    };
  }

  /**
   * Clear the message queue
   * @returns {number} Number of messages cleared
   */
  clear() {
    const count = this.queue.length;
    this.queue = [];
    logger.info(`Cleared ${count} messages from queue`);
    return count;
  }
}

// Export singleton instance
const messageQueue = new MessageQueue();
module.exports = messageQueue;
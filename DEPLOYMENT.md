# Deployment Guide

This document provides detailed instructions for deploying the WhatsApp API service in different environments.

## Local Deployment

1. **Prerequisites**:
   - Node.js 18+
   - MongoDB (local or cloud instance)
   - Chrome or Chromium browser

2. **Setup**:
   ```bash
   # Install dependencies
   npm install

   # Configure environment variables
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings

   # Start the application
   npm start
   ```

3. **Authentication**:
   - Open http://localhost:3000 in your browser
   - Scan the QR code with WhatsApp on your mobile device

## Docker Deployment

1. **Prerequisites**:
   - Docker and Docker Compose
   - MongoDB instance (can be external)

2. **Setup**:
   ```bash
   # Create .env file with your settings
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings

   # Build and start containers
   docker-compose up -d

   # View logs
   docker-compose logs -f app
   ```

3. **Authentication**:
   - Open http://localhost:3000 in your browser
   - Scan the QR code with WhatsApp on your mobile device

## Cloud Deployment (Render)

1. **Prerequisites**:
   - Render account
   - MongoDB Atlas account

2. **Setup on Render**:
   - Create a new Web Service
   - Connect to your GitHub repository
   - Set environment variables:
     - NODE_ENV=production
     - MONGODB_URI=(your MongoDB Atlas URI)
     - PORT=10000 (Render default)
     - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
     - Other configuration variables as needed
   - Set Docker as the deployment method
   - Deploy the service

3. **Authentication**:
   - Open your Render service URL
   - Scan the QR code with WhatsApp on your mobile device

## Production Considerations

1. **Persistent Storage**:
   - For Docker: Use volumes for logs and session data
   - For cloud: Consider adding a persistent storage service

2. **Security**:
   - Use environment variables for sensitive information
   - Set up network policies to restrict access
   - Implement API authentication for production

3. **Monitoring**:
   - Set up health checks
   - Configure log monitoring
   - Set up alerts for critical errors

4. **Scaling**:
   - Use a load balancer if deploying multiple instances
   - Note that each instance needs its own WhatsApp authentication

5. **Backup**:
   - Regular MongoDB backups
   - Document your restoration process
# WhatsApp Gateway for n8n

A production-ready WhatsApp Web gateway service built with Node.js, designed to seamlessly integrate WhatsApp messaging with n8n automation workflows.

## Features

- WhatsApp Web client integration using whatsapp-web.js
- Session persistence with MongoDB via RemoteAuth
- REST API for sending and receiving messages
- QR code generation for authentication
- Docker support for easy deployment with multi-stage builds
- Comprehensive error handling and message queue system
- Secure configuration management with environment variables
- Graceful shutdown handling
- Health check endpoints for container orchestration

## Prerequisites

- Node.js 18+
- MongoDB database
- Docker and Docker Compose (for containerized deployment)

## Installation

### Local Development

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/whatsapp-gateway-for-n8n.git
   cd whatsapp-gateway-for-n8n
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Create `.env` file based on `.env.example` and add your configuration:

   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   ```
4. Start the development server:

   ```bash
   npm run dev
   ```

### Docker Deployment

1. Build and run using Docker Compose:

   ```bash
   # Standard build and run
   docker-compose up -d
   
   # Force a clean build with no cache
   docker-compose build --no-cache
   docker-compose up -d
   ```
2. View logs:

   ```bash
   docker-compose logs -f
   ```
3. Stop the service:

   ```bash
   docker-compose down
   ```

4. The Docker setup includes:
   - Multi-stage builds for smaller image size
   - Chromium browser pre-installed for WhatsApp Web
   - Non-root user for improved security
   - Health checks for container orchestration
   - Volume mounts for logs and QR code persistence

## API Endpoints

### Authentication

- **GET /** - View QR code for WhatsApp Web authentication
- **GET /health** - Health check endpoint
- **GET /version** - Get application version

### WhatsApp API

- **POST /api/whatsapp/initialize** - Initialize WhatsApp client
- **POST /api/whatsapp/send** - Send a message
  ```json
  {
    "message": "Hello, this is a test message",
    "title": "Test Message",
    "to": "123456789@c.us",  // Optional, defaults to admin number
    "priority": "normal"     // Optional: "high", "normal", "low"
  }
  ```
- **GET /api/whatsapp/status** - Get WhatsApp client status
- **POST /api/whatsapp/destroy** - Destroy WhatsApp client
- **POST /api/whatsapp/logout** - Logout from WhatsApp Web session
- **GET /api/whatsapp/queue** - Get message queue status
- **DELETE /api/whatsapp/queue** - Clear message queue

## Configuration

All configuration is managed through environment variables:

| Variable                  | Description                                | Default            |
| ------------------------- | ------------------------------------------ | ------------------ |
| PORT                      | Server port                                | 3000               |
| NODE_ENV                  | Node environment                           | development        |
| MONGODB_URI               | MongoDB connection string                  | -                  |
| PUPPETEER_EXECUTABLE_PATH | Path to Chromium/Chrome executable         | -                  |
| ADMIN_PHONE               | Admin WhatsApp number (with @c.us suffix)  | 91xxxxxxxxxx@c.us  |
| WEBHOOK_URL               | Webhook URL for incoming messages          | n8n webhook url    |
| CLIENT_LIFETIME           | Client lifetime in milliseconds            | 300000 (5 minutes) |
| MESSAGE_DELAY             | Delay between message sends (ms)           | 1000               |
| MAX_RETRIES               | Maximum retry attempts for failed messages | 3                  |
| RETRY_DELAY               | Delay between retry attempts (ms)          | 5000               |
| QUEUE_CONCURRENCY         | Number of concurrent messages to process   | 1                  |

For Docker deployments, the container automatically installs and configures Chromium, so you don't need to set `PUPPETEER_EXECUTABLE_PATH` manually.

## Architecture

- **services/whatsappService.js** - Core WhatsApp client functionality with RemoteAuth integration
- **routes/** - API route handlers for WhatsApp operations and status endpoints
- **config/** - Configuration management with centralized environment variable handling
- **utils/** 
  - **logger.js** - Structured logging with proper log levels
  - **errorHandler.js** - Centralized error handling with custom error classes
  - **messageQueue.js** - Robust queue system for reliable message processing with retries

## Security Notes

- This application implements various security best practices:
  - Multi-stage Docker builds to minimize attack surface
  - Non-root user in Docker container (runs as `whatsapp` user)
  - Environment variables for sensitive information
  - Session data stored in MongoDB with RemoteAuth encryption
  - Security HTTP headers for XSS protection
  - Proper error handling to prevent information leakage
  - Graceful shutdown procedures for data integrity
  - Health checks for container orchestration systems

## License

ISC

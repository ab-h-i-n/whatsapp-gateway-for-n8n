# WhatsApp Gateway for n8n | Free WhatsApp Integration

A production-ready, **free and open-source** WhatsApp Web gateway service built with Node.js, designed to seamlessly integrate WhatsApp messaging with n8n automation workflows. Send and receive WhatsApp messages directly through your n8n workflows without any subscription fees or API costs.

![WhatsApp Gateway for n8n](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![n8n Integration](https://img.shields.io/badge/n8n-Workflow-blue?style=for-the-badge)
![Docker Ready](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)

## 🚀 Features

- **Free WhatsApp Integration** - No subscription fees, API costs, or rate limits
- **[whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) Integration** - Built on the powerful, open-source WhatsApp Web client library
- **Two-way Messaging** - Both send AND receive WhatsApp messages in n8n workflows
- **Session Persistence** - MongoDB integration via RemoteAuth for reliable sessions
- **Easy Authentication** - QR code generation for simple WhatsApp Web connection
- **Production Ready**:
  - Docker support with multi-stage builds
  - Comprehensive error handling with retry mechanism
  - Robust message queue system for reliable delivery
  - Secure configuration management
  - Graceful shutdown handling
  - Health check endpoints for container orchestration

## 🤔 Why This Project?

Most WhatsApp integration solutions for n8n require paid third-party services with monthly subscription fees. This project provides:

- **Zero Cost Integration** - Completely free alternative to paid WhatsApp APIs
- **No Rate Limits** - Send as many messages as you need
- **Full Message Control** - Direct access to WhatsApp Web client capabilities
- **Privacy Focused** - Your WhatsApp data stays within your infrastructure
- **Perfect for** automation workflows, notifications, customer support, alerts, and more

## 📋 Prerequisites

- Node.js 18+
- MongoDB database (for session persistence)
- Docker and Docker Compose (for containerized deployment)
- A WhatsApp account for authentication

## 🛠️ Installation

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

## 📱 WhatsApp Integration Details

This project is powered by [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), an amazing open-source library that provides a clean interface to interact with WhatsApp Web. The library enables:

- Full WhatsApp Web support without requiring an API key
- Session management and authentication via QR codes
- Sending and receiving text, media, and location messages
- Group management capabilities
- Status updates and presence detection

When integrating with n8n, this gateway acts as the bridge between your automation workflows and WhatsApp, enabling you to send personalized messages, receive and process incoming messages, and build complex conversation flows.

## 🔌 API Endpoints

### Authentication and Status

- **GET /** - View QR code for WhatsApp Web authentication
- **GET /health** - Health check endpoint (useful for container orchestration)
- **GET /version** - Get application version information

### WhatsApp Messaging API

- **POST /api/whatsapp/initialize** - Initialize WhatsApp client and start session
- **GET /api/whatsapp/status** - Check WhatsApp connection status (authenticated, connected, etc.)
- **POST /api/whatsapp/send** - Send a WhatsApp message
  ```json
  {
    "message": "Hello, this is a test message from n8n workflow!",
    "title": "Test Message",
    "to": "123456789@c.us",  // Optional, defaults to admin number
    "priority": "normal"     // Optional: "high", "normal", "low"
  }
  ```
- **POST /api/whatsapp/destroy** - Properly destroy WhatsApp client
- **POST /api/whatsapp/logout** - Logout from WhatsApp Web session
- **GET /api/whatsapp/queue** - Check status of message queue (useful for debugging)
- **DELETE /api/whatsapp/queue** - Clear pending message queue

## ⚙️ Configuration

All configuration is managed through environment variables for easy deployment and security:

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

## 🔄 Integration with n8n

Setting up this gateway with n8n is straightforward:

1. Deploy this WhatsApp Gateway using the instructions above
2. In n8n, create a new workflow
3. Add an HTTP Request node to send messages:
   - Method: POST
   - URL: http://your-gateway:3000/api/whatsapp/send
   - Body: JSON with message details (as shown in API endpoints)
4. To receive messages:
   - Create a Webhook node in n8n
   - Copy the webhook URL
   - Set this URL as the WEBHOOK_URL in your gateway's environment
   - Incoming WhatsApp messages will trigger your n8n workflow

This gives you a **completely free WhatsApp integration** for your n8n workflows!

## 🏗️ Architecture

This project follows a modular architecture designed for production use:

- **services/whatsappService.js** - Core WhatsApp client functionality using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) with RemoteAuth integration
- **routes/** - RESTful API route handlers for WhatsApp operations and status endpoints
- **config/** - Configuration management with centralized environment variable handling
- **utils/** 
  - **logger.js** - Structured logging with proper log levels for production monitoring
  - **errorHandler.js** - Centralized error handling with custom error classes
  - **messageQueue.js** - Robust queue system for reliable message processing with retries

## 🔐 Security Features

This application implements various security best practices for production deployment:

- **Docker Security**:
  - Multi-stage Docker builds to minimize attack surface
  - Non-root user in container (runs as `whatsapp` user)
  - Container health checks for orchestration systems

- **Data Protection**:
  - Environment variables for sensitive information
  - Session data stored in MongoDB with RemoteAuth encryption
  - Security HTTP headers for XSS protection

- **Error Handling & Reliability**:
  - Proper error handling to prevent information leakage
  - Graceful shutdown procedures for data integrity
  - Retry mechanisms for failed messages

This ensures your WhatsApp integration is not only free but also secure and reliable for business use.

## 🚀 Use Cases

With this free WhatsApp Gateway for n8n, you can build a wide range of automation workflows:

- **Customer Support** - Automatically respond to common inquiries
- **Notifications** - Send alerts, reminders, and updates to users
- **Appointment Scheduling** - Manage bookings and send confirmations
- **Order Updates** - Notify customers about order status changes
- **Lead Generation** - Capture and qualify leads from WhatsApp
- **Internal Alerts** - Send system alerts to technical teams
- **Two-Factor Authentication** - Add an additional security layer
- **Interactive Surveys** - Collect feedback from customers

All without any monthly fees or subscription costs typically associated with WhatsApp Business API providers.

## 📄 License

ISC

---

**WhatsApp Gateway for n8n** | Free WhatsApp Integration for n8n Automation Workflows

Built with [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) and Node.js | A cost-effective solution for WhatsApp messaging automation.

# Crypto Intelligence Engine

The Real-time Crypto Intelligence Engine is a full-stack application designed to extract real-time cryptocurrency-related signals from social media platforms.

## Project Structure

- **client**: React frontend application using TypeScript and Tailwind CSS
- **server**: Node.js backend API using Express and SQLite

## Features

- User Authentication System (Login/Register)
- Cryptocurrency Asset Selection (Users can track 3-5 assets)
- Real-time Signal Display (Sentiment and narrative signals from Twitter/Reddit)
- Signal Filtering System (Filter by time, type, strength, source)
- Signal Detail View (Including charts and source analysis)
- Notification Preferences
- Dark/Light Mode Toggle
- User Feedback System

## Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router v6
- Chart.js (Data Visualization)
- Socket.IO Client (Real-time Updates)

### Backend
- Node.js
- Express
- TypeScript
- SQLite (via Sequelize ORM)
- Socket.IO (WebSocket)
- JWT Authentication

## Installation and Running

### Prerequisites
- Node.js >= 18.0.0

### Quick Start

```bash
# Add execution permissions
chmod +x start-service.sh

# Run startup script
./start-service.sh
```

The startup script will automatically:
1. Check and kill old processes occupying ports
2. Create necessary directories
3. Generate environment variable files (if not exist)
4. Install dependencies (if needed)
5. Start frontend and backend services

### Manual Dependency Installation

```bash
# Install all dependencies (client and server)
npm install
```

### Environment Variables Setup

1. Create `.env` file in the `server` directory
2. Add the following environment variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
SQLITE_DB_PATH=data/crypto-intel.sqlite

# JWT Configuration
JWT_SECRET=crypto-intel-secret-key-for-development
JWT_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Mock Signal Configuration
ENABLE_MOCK_SIGNALS=true
```

### Manual Development Server Launch

```bash
# Run both frontend and backend
npm run dev

# Run frontend only
npm run dev:client

# Run backend only
npm run dev:server
```

### Build Production Version

```bash
npm run build
```

## Data Initialization

When running the project for the first time, you need to initialize default asset data. Use the following API endpoint:

```
POST /api/assets/initialize
```

You can send this request using Postman or curl.

## Demo Account

You can log in to the system using the following demo account:

- Email: demo@example.com
- Password: demo123

## API Documentation

API Endpoints:

- Authentication:
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - User login

- Users:
  - `GET /api/users/me` - Get current user information
  - `GET /api/users/assets` - Get user selected assets
  - `POST /api/users/assets` - Update user selected assets
  - `PUT /api/users/profile` - Update user profile

- Assets:
  - `GET /api/assets` - Get all assets
  - `GET /api/assets/:id` - Get single asset details
  - `POST /api/assets/initialize` - Initialize default assets (development only)

- Signals:
  - `GET /api/signals` - Get signal list
  - `GET /api/signals/:id` - Get single signal details

## WebSocket

WebSocket connection is used for real-time signal updates, connection address:

```
ws://localhost:5000
```

Authentication token needs to be provided when connecting:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

WebSocket events:
- `subscribe` - Subscribe to asset signals
- `unsubscribe` - Unsubscribe from asset signals
- `newSignal` - Receive new signals

## License

MIT 
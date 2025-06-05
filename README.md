# 🚀 Crypto Intelligence Engine

A comprehensive cryptocurrency analysis and monitoring platform that provides real-time market intelligence, social sentiment analysis, and trading signals.

## ✨ Features

- **📊 Real-time Price Monitoring**: Live cryptocurrency price tracking with CoinGecko integration
- **🎭 Sandbox Mode**: Development-friendly mock data for testing (NEW!)
- **🔍 Social Sentiment Analysis**: Twitter account discovery and sentiment tracking
- **📈 Signal Generation**: Automated trading signals based on price movements
- **📱 Real-time Notifications**: WebSocket-powered live updates
- **👤 User Authentication**: Secure user accounts with JWT
- **💎 Portfolio Tracking**: Multi-asset monitoring and analysis
- **🌓 Dark Mode**: Modern, responsive UI with dark theme support

## 🎭 Sandbox Mode (Development Feature)

For development and testing purposes, this application includes a **Sandbox Mode** that allows you to work with realistic mock data when real API access is not available.

### Quick Setup for Development

```bash
# Clone the repository
git clone <repository-url>
cd CryptoData

# Copy environment example
cp env.example .env

# Enable sandbox mode for development
echo "SANDBOX_MODE=enabled" >> .env
echo "NODE_ENV=development" >> .env

# Install dependencies and start
npm install
npm run dev
```

### Sandbox Mode Benefits

- ✅ **No API Limits**: Unlimited requests for testing
- ✅ **Offline Development**: Works without internet
- ✅ **Consistent Data**: Predictable mock responses
- ✅ **Fast Testing**: No network latency
- ⚠️ **Development Only**: Never use in production

📖 **[Read the Complete Sandbox Guide](SANDBOX_MODE_GUIDE.md)**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CryptoData
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and configure your settings
   # For development with mock data:
   SANDBOX_MODE=enabled
   NODE_ENV=development
   
   # For production with real APIs:
   SANDBOX_MODE=disabled
   TWITTER_BEARER_TOKEN=your-real-token
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Health Check: http://localhost:5001/health

## 🛠️ Environment Configuration

### Development Mode (Recommended for beginners)
```bash
# .env
NODE_ENV=development
SANDBOX_MODE=enabled
TWITTER_MOCK_ENABLED=true
NEWS_MOCK_ENABLED=true
JWT_SECRET=dev-secret-key
```

### Production Mode (Real APIs required)
```bash
# .env
NODE_ENV=production
SANDBOX_MODE=disabled
FORCE_PRODUCTION_DATA=true
TWITTER_BEARER_TOKEN=your-production-token
NEWS_API_KEY=your-news-api-key
DATABASE_URL=postgresql://...
```

### API Keys (for real data)

| Service | Environment Variable | Required | Purpose |
|---------|---------------------|----------|---------|
| Twitter | `TWITTER_BEARER_TOKEN` | For real social data | Social sentiment analysis |
| News APIs | `NEWS_API_KEY` | For real news data | News sentiment tracking |
| CoinGecko | `COINGECKO_API_KEY` | Optional | Enhanced price data |

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Data Sources  │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (APIs/Mock)   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • CoinGecko     │
│ • Auth UI       │    │ • WebSocket     │    │ • Twitter API   │
│ • Real-time     │    │ • Signal Gen    │    │ • Sandbox Data  │
│ • Sandbox UI    │    │ • Sandbox Mode  │    │ • SQLite/PostgreSQL │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for development and building
- **Heroicons** for icons
- **Axios** for HTTP requests

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Socket.IO** for real-time updates
- **Sequelize** ORM with SQLite/PostgreSQL
- **JWT** for authentication

### Data Sources
- **CoinGecko API** - Real-time price data
- **Twitter API v2** - Social sentiment (with sandbox fallback)
- **Sandbox Services** - Mock data for development

## 🧪 Testing

### Test Sandbox Mode
```bash
# Run the sandbox test script
node test-sandbox-mode.js
```

Expected output for sandbox mode:
```
🎭 Testing Sandbox Mode Configuration

1. Testing Health Endpoint...
   ✅ Status: healthy

2. Testing Social Sentiment Search...
   ✅ Found 5 accounts
   ✅ Search Method: Sandbox Mock Data (Development Only)
   🎭 SANDBOX MODE DETECTED
```

### Manual Testing
```bash
# Test health endpoint
curl http://localhost:5001/health

# Test Twitter search (sandbox)
curl "http://localhost:5001/api/social-sentiment/search-accounts-coin?symbol=BTC&limit=3"
```

## 📝 API Documentation

### Core Endpoints

- **Health**: `GET /health` - Service status
- **Authentication**: `POST /api/auth/login` - User login
- **Assets**: `GET /api/assets` - Available cryptocurrencies
- **Signals**: `GET /api/signals` - Trading signals
- **Social Sentiment**: `GET /api/social-sentiment/search-accounts-coin` - Twitter accounts

### WebSocket Events

- `newSignal` - Real-time trading signals
- `priceUpdate` - Live price changes
- `sentimentUpdate` - Social sentiment changes

## 🚀 Deployment

### Local Development
```bash
npm run dev  # Starts both frontend and backend
```

### Production Build
```bash
npm run build  # Builds both components
npm start      # Starts production server
```

### Railway Deployment

1. **Fork the repository**
2. **Connect to Railway**
3. **Set environment variables**:
   ```bash
   NODE_ENV=production
   SANDBOX_MODE=disabled
   FORCE_PRODUCTION_DATA=true
   TWITTER_BEARER_TOKEN=your-production-token
   DATABASE_URL=postgresql://...
   ```
4. **Deploy**: Railway will automatically build and deploy

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `SANDBOX_MODE` | `auto` | Mock data control |
| `PORT` | `5001` | Server port |
| `JWT_SECRET` | Required | Authentication secret |
| `TWITTER_BEARER_TOKEN` | Optional | Real Twitter API |
| `DATABASE_URL` | SQLite | Database connection |

### Sandbox Mode Options

| Mode | Description | Use Case |
|------|-------------|----------|
| `auto` | Smart detection | Recommended default |
| `enabled` | Force sandbox | Development/testing |
| `disabled` | Force real APIs | Production/testing |

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes and test**:
   ```bash
   # Test with sandbox mode
   SANDBOX_MODE=enabled npm run dev
   
   # Test with real APIs (if available)
   SANDBOX_MODE=disabled npm run dev
   ```
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

- **Server won't start**: Check environment variables in `.env`
- **API errors**: Enable sandbox mode for development: `SANDBOX_MODE=enabled`
- **Database issues**: Delete `data/crypto-intel.sqlite` and restart
- **Port conflicts**: Change `PORT` in `.env`

### Getting Help

1. **Check the [Sandbox Mode Guide](SANDBOX_MODE_GUIDE.md)**
2. **Review server logs** for error details
3. **Test with**: `node test-sandbox-mode.js`
4. **Open an issue** with detailed error information

### Useful Commands

```bash
# Clean restart
rm -rf node_modules package-lock.json
npm install

# Reset database
rm -f data/crypto-intel.sqlite

# Check environment
node -e "console.log(process.env.SANDBOX_MODE)"

# Test API connection
curl http://localhost:5001/health
```

---

**Built with ❤️ for the crypto community. Always verify data accuracy before making financial decisions.** 
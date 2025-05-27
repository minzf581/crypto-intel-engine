# API Configuration Guide

## Environment Variables Setup

请在项目根目录创建 `.env` 文件，包含以下内容：

```bash
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
SQLITE_DB_PATH=data/crypto-intel.sqlite

# JWT Configuration
JWT_SECRET=crypto-intelligence-jwt-secret-key-2024
JWT_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CLIENT_URL=http://localhost:3000

# API Keys for Real Data Sources
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAMwHxgEAAAAAvzWqnjNUUhsOPPct2dEkQ4vAmjA%3D9uQ6V6kp9wexPcwKCwwgZoHNadH8TGtyxtsYJxQhUh2QNNZqHS
NEWS_API_KEY=bb7bd00c5129414f9782940d75e093d2
ETHERSCAN_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U

# Additional Blockchain APIs (using Etherscan key for all)
BLOCKCHAIN_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U
BSC_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U

# CoinGecko API (optional - has free tier)
COINGECKO_API_KEY=

# Firebase Configuration (for push notifications - optional)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

## API Services Now Enabled

With these API keys configured, the following services will now work with real data:

### ✅ Twitter Social Sentiment Analysis
- **API**: Twitter API v2
- **Key**: TWITTER_BEARER_TOKEN
- **Features**: Account search, post monitoring, sentiment analysis

### ✅ News Sentiment Analysis  
- **API**: NewsAPI.org
- **Key**: NEWS_API_KEY
- **Features**: Crypto news fetching, sentiment analysis, breaking news alerts

### ✅ Ethereum On-Chain Analysis
- **API**: Etherscan.io
- **Key**: ETHERSCAN_API_KEY
- **Features**: Transaction analysis, whale tracking, network metrics

### ⚠️ Additional Blockchain Networks
The same Etherscan key will be used for:
- Ethereum mainnet analysis
- BSC (Binance Smart Chain) analysis (if supported)
- General blockchain metrics

## Setup Instructions

1. **Create .env file**: Copy the above configuration to a new `.env` file in your project root
2. **Restart server**: The services will automatically use the real APIs
3. **Verify functionality**: Check logs for successful API connections

## Security Notes

- ✅ API keys are stored in environment variables (not in code)
- ✅ .env file should be in .gitignore (never commit API keys)
- ✅ Keys are valid for production use

## Rate Limits

- **Twitter API**: 300 requests per 15 minutes
- **NewsAPI**: 1000 requests per day (free tier)
- **Etherscan**: 5 calls per second (free tier)

Monitor logs for any rate limit warnings. 
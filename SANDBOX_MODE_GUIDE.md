# 🎭 Sandbox Mode Configuration Guide

The Crypto Intelligence Engine includes a **Sandbox Mode** for development and testing purposes. This allows developers to work with realistic mock data when real API access is not available or desired.

## ⚠️ Important Notice

**Sandbox mode is for DEVELOPMENT and TESTING only. Production environments must always use real data sources.**

## 🚀 Quick Start

### Enable Sandbox Mode
```bash
# Copy environment example
cp env.example .env

# Edit .env file and set:
SANDBOX_MODE=enabled
NODE_ENV=development
```

### Start Development Server
```bash
npm run dev
```

## 📋 Environment Variables

### Core Sandbox Configuration

| Variable | Values | Description |
|----------|--------|-------------|
| `SANDBOX_MODE` | `auto`, `enabled`, `disabled` | Controls sandbox mode |
| `FORCE_PRODUCTION_DATA` | `true`, `false` | Forces real data even in development |

### Individual Feature Controls

| Variable | Default | Description |
|----------|---------|-------------|
| `TWITTER_MOCK_ENABLED` | `true` | Enable Twitter mock data |
| `NEWS_MOCK_ENABLED` | `true` | Enable news mock data |
| `PRICE_SIMULATION_ENABLED` | `false` | Enable price simulation (not recommended) |

## 🎯 Sandbox Mode Options

### 1. Auto Mode (Recommended)
```bash
SANDBOX_MODE=auto
```
- **Development**: Automatically enables sandbox features
- **Production**: Automatically disables sandbox features
- **Railway/Cloud**: Uses real APIs

### 2. Enabled Mode (Development/Testing)
```bash
SANDBOX_MODE=enabled
```
- Forces sandbox mode regardless of environment
- Useful for testing specific scenarios
- Shows clear warnings in UI and logs

### 3. Disabled Mode (Real APIs)
```bash
SANDBOX_MODE=disabled
```
- Forces real API usage
- Requires all API keys to be configured
- Recommended for production-like testing

## 🔧 Configuration Examples

### Local Development with Mock Data
```bash
# .env
NODE_ENV=development
SANDBOX_MODE=enabled
TWITTER_MOCK_ENABLED=true
NEWS_MOCK_ENABLED=true
PRICE_SIMULATION_ENABLED=false

# Database
SQLITE_DB_PATH=data/crypto-intel.sqlite

# Auth
JWT_SECRET=dev-secret-key
```

### Local Development with Real APIs
```bash
# .env
NODE_ENV=development
SANDBOX_MODE=disabled

# Real API Keys
TWITTER_BEARER_TOKEN=your-real-bearer-token
NEWS_API_KEY=your-real-news-api-key

# Database
SQLITE_DB_PATH=data/crypto-intel.sqlite
```

### Production Configuration
```bash
# .env (Railway/Production)
NODE_ENV=production
SANDBOX_MODE=disabled
FORCE_PRODUCTION_DATA=true

# All real API keys must be configured
TWITTER_BEARER_TOKEN=production-bearer-token
NEWS_API_KEY=production-news-api-key
# ... other production keys

# Production database
DATABASE_URL=postgresql://...
```

## 📊 What Gets Mocked in Sandbox Mode

### ✅ Twitter Service (when `TWITTER_MOCK_ENABLED=true`)
- **Account Search**: Generates realistic crypto influencer profiles
- **User Profiles**: Complete with followers, bio, verification status
- **Engagement Metrics**: Realistic follower counts and activity levels
- **Relevance Scoring**: Simulated relevance to cryptocurrency queries

### ✅ News Service (when `NEWS_MOCK_ENABLED=true`)
- **News Articles**: Generates crypto-related news content
- **Sentiment Analysis**: Positive/negative/neutral sentiment scores
- **Source Attribution**: Simulated news sources and timestamps
- **Impact Scoring**: Realistic market impact assessments

### ❌ Price Data (Real Data Only)
- **Always Real**: Uses CoinGecko API for authentic price data
- **No Simulation**: `PRICE_SIMULATION_ENABLED` should remain `false`
- **Live Updates**: Real-time price monitoring continues to work

## 🎨 Frontend Integration

### Automatic Detection
The frontend automatically detects sandbox mode and shows appropriate warnings:

```typescript
import { getSandboxWarningMessage, shouldShowSandboxWarning } from '@/config/sandboxConfig';

// Check if warnings should be shown
if (shouldShowSandboxWarning('twitter')) {
  const warning = getSandboxWarningMessage();
  // Display: "⚠️ Development Mode: Using sandbox data for testing purposes"
}
```

### Visual Indicators
- **[SANDBOX]** prefix in data source labels
- Warning banners in relevant UI components
- Console logging of sandbox status
- Clear distinction between real and mock data

## 🔍 Debugging and Monitoring

### Backend Logs
```bash
# Sandbox configuration is logged on startup
🎭 Sandbox Configuration:
   Mode: SANDBOX
   Sandbox Enabled: true
   Twitter Mock: true
   News Mock: true
   ⚠️  WARNING: Using development sandbox data!
```

### Frontend Console
```bash
# Frontend automatically logs detected mode
🎭 Frontend Sandbox Configuration:
   Backend Sandbox Enabled: true
   Show Sandbox Warnings: true
   ⚠️  WARNING: Frontend detected backend sandbox mode!
```

### API Response Indicators
```json
{
  "accounts": [...],
  "searchMethod": "Sandbox Mock Data (Development Only)"
}
```

## 🚀 Deployment Scenarios

### Railway Deployment

#### Backend Service
```bash
# Railway Environment Variables
NODE_ENV=production
SANDBOX_MODE=disabled
FORCE_PRODUCTION_DATA=true

# Real API keys
TWITTER_BEARER_TOKEN=your-production-token
```

#### Frontend Service
```bash
# Railway Frontend (auto-detected)
VITE_API_URL=https://your-backend.railway.app
```

### Local to Production Migration

1. **Development Phase**
   ```bash
   SANDBOX_MODE=enabled  # Use mock data
   ```

2. **Testing Phase**
   ```bash
   SANDBOX_MODE=disabled  # Test with real APIs
   ```

3. **Production Deployment**
   ```bash
   NODE_ENV=production
   SANDBOX_MODE=disabled
   FORCE_PRODUCTION_DATA=true
   ```

## ⚡ Performance Considerations

### Sandbox Mode Benefits
- **No API Limits**: Unlimited requests to mock services
- **Fast Response**: No network latency for mock data
- **Offline Development**: Works without internet connectivity
- **Consistent Data**: Predictable mock responses for testing

### Real API Mode Considerations
- **Rate Limits**: Twitter API has request limitations
- **Network Dependency**: Requires internet connectivity
- **API Costs**: Some services have usage fees
- **Variable Data**: Real-world data variability

## 🔒 Security Considerations

### Development Safety
- Mock data contains no real user information
- No actual API calls made in sandbox mode
- Safe for public demos and testing
- No risk of exposing real API credentials

### Production Requirements
- All real API keys must be secured
- Environment variables properly configured
- No sandbox mode in production environments
- Regular security audits of API access

## 🐛 Troubleshooting

### Common Issues

#### Sandbox Mode Not Working
```bash
# Check environment variables
echo $SANDBOX_MODE
echo $NODE_ENV

# Verify server logs show sandbox enabled
grep "Sandbox Configuration" logs/server.log
```

#### Mixed Data Sources
```bash
# Ensure consistent configuration
SANDBOX_MODE=enabled  # All features use sandbox
# OR
SANDBOX_MODE=disabled  # All features use real APIs
```

#### Frontend Not Detecting Sandbox
```bash
# Check browser console for sandbox logs
# Verify VITE_SANDBOX_MODE if explicitly set
```

### Getting Help

1. **Check Logs**: Both backend and frontend console logs
2. **Verify Config**: Ensure environment variables are correctly set
3. **Test APIs**: Verify real API credentials if using disabled mode
4. **Clear Cache**: Browser and server cache may need clearing

## 📈 Future Enhancements

### Planned Features
- **Advanced Mock Scenarios**: Configurable market conditions
- **Historical Data Simulation**: Time-travel capabilities for testing
- **A/B Testing**: Compare real vs mock data responses
- **Performance Metrics**: Sandbox vs real API response times

### Contributing
- Submit issues for sandbox-related bugs
- Suggest improvements for mock data quality
- Help improve documentation and examples

---

**Remember: Sandbox mode is a powerful development tool. Always ensure production environments use real, verified data sources for accurate financial analysis.** 
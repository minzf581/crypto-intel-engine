# Railway Environment Variables Setup

## Problem Identified
The `.env` files containing `TWITTER_BEARER_TOKEN` are not pushed to GitHub because they are ignored by `.gitignore`. This causes Railway deployment to fail with:

```
❌ Failed to start server: Error: Twitter API configuration required. Please set TWITTER_BEARER_TOKEN environment variable. Demo data is not allowed for financial applications.
```

## Solution: Configure Environment Variables in Railway

### Step 1: Access Railway Dashboard
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your CryptoData project
3. Click on your service

### Step 2: Add Required Environment Variables
In the Railway dashboard, go to **Variables** tab and add these **REQUIRED** variables:

```
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAMwHxgEAAAAATkG26yjdHnbj5EJONgTGGmFTnVk%3DdTKzlXs6zyBOW1XhRgGCBqFYwMQwwDVCPBYyYNYTBx7ZFUJBfB
TWITTER_CLIENT_ID=LTlZS0JRc0twaWx1LWFmeEhkZEk6MTpjaQ
TWITTER_CLIENT_SECRET=VGKKcax8RwaKPhdWwxD_WwtFjQrXTMr1h2ZVF36CVD41RvyJQG
```

### Step 3: Add Database Configuration
**CRITICAL**: Add the PostgreSQL database URL you provided:
```
DATABASE_URL=postgresql://postgres:fljcfRKvBuPfzaxefVxekBoxNJGZVMDy@turntable.proxy.rlwy.net:36992/railway
```

### Step 4: Add Production Configuration Variables
```
NODE_ENV=production
PORT=5001
JWT_SECRET=crypto-intelligence-jwt-secret-key-2024
JWT_EXPIRES_IN=30d
```

### Step 5: Add Optional API Keys (for enhanced features)
```
NEWS_API_KEY=bb7bd00c5129414f9782940d75e093d2
ETHERSCAN_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U
BLOCKCHAIN_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U
BSC_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U
```

### Step 6: Add CORS Configuration for Production
```
CORS_ORIGIN=https://your-frontend-domain.railway.app
CLIENT_URL=https://your-frontend-domain.railway.app
```

### Step 7: Redeploy
After adding the environment variables:
1. Click **Deploy** or trigger a new deployment
2. The service should now start successfully with Twitter API access

## Verification
Once deployed, the logs should show:
```
✅ Twitter service initialized with real API token
🚀 Server listening on 0.0.0.0:5001 (production mode)
✅ Server ready for health checks
✅ Database connected
✅ Database models synchronized (Railway mode - force sync)
✅ Seed data initialized
Created default demo user: demo@example.com
Created 8 default assets
🎉 All services initialized - Server fully ready!
```

## Complete Environment Variables List
Here's the complete list for copy-paste into Railway:

```
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAMwHxgEAAAAATkG26yjdHnbj5EJONgTGGmFTnVk%3DdTKzlXs6zyBOW1XhRgGCBqFYwMQwwDVCPBYyYNYTBx7ZFUJBfB
TWITTER_CLIENT_ID=LTlZS0JRc0twaWx1LWFmeEhkZEk6MTpjaQ
TWITTER_CLIENT_SECRET=VGKKcax8RwaKPhdWwxD_WwtFjQrXTMr1h2ZVF36CVD41RvyJQG
DATABASE_URL=postgresql://postgres:fljcfRKvBuPfzaxefVxekBoxNJGZVMDy@turntable.proxy.rlwy.net:36992/railway
NODE_ENV=production
PORT=5001
JWT_SECRET=crypto-intelligence-jwt-secret-key-2024
JWT_EXPIRES_IN=30d
NEWS_API_KEY=bb7bd00c5129414f9782940d75e093d2
ETHERSCAN_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U
BLOCKCHAIN_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U
BSC_API_KEY=NTMRNJNF6NFPVJRWXUS9X3W1U93U7GAV1U
```

## Database Setup Notes
- Railway will use PostgreSQL instead of SQLite
- The seed data (including demo@example.com user) will be automatically created
- All database tables will be created automatically on first deployment
- The demo user credentials are: `demo@example.com` / `demo123`

## Security Note
- Never commit `.env` files to version control
- Always use Railway's environment variables for production secrets
- The current `.gitignore` setup is correct for security
- Update CORS_ORIGIN and CLIENT_URL with your actual frontend domain once deployed
- The DATABASE_URL contains sensitive credentials - keep it secure 
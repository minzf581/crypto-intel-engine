# Railway Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Changes Applied
- [ ] Health check endpoints optimized (`/` and `/health`)
- [ ] Server initialization refactored for immediate startup
- [ ] Background service initialization implemented
- [ ] TypeScript errors fixed (port configuration)
- [ ] Railway configuration file created (`railway.toml`)

### 2. Files Verified
- [ ] `server/src/index.ts` - Updated with health check fixes
- [ ] `railway.toml` - Railway configuration present
- [ ] `package.json` - Scripts updated
- [ ] `server.js` - Entry point exists

### 3. Local Testing Completed
- [ ] Server builds successfully (`cd server && npm run build`)
- [ ] Server starts without errors (`NODE_ENV=production node server.js`)
- [ ] Health check responds with 200 OK (`curl http://localhost:3001/`)
- [ ] API endpoints work (`curl http://localhost:3001/api/dashboard/data`)

## 🚀 Deployment Steps

### 1. Push to Repository
```bash
git add .
git commit -m "Fix Railway deployment health checks - Final"
git push origin main
```

### 2. Railway Configuration
In Railway dashboard, set environment variables:
- [ ] `NODE_ENV=production` (Required)
- [ ] `TWITTER_CLIENT_ID` (Optional)
- [ ] `TWITTER_CLIENT_SECRET` (Optional)
- [ ] `COINGECKO_API_KEY` (Optional)

### 3. Deploy
- [ ] Railway automatically detects changes
- [ ] Build process completes successfully
- [ ] Health check passes
- [ ] Application is accessible

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-app.railway.app/
```
Expected: 200 OK with JSON response

### 2. API Test
```bash
curl https://your-app.railway.app/api/dashboard/data
```
Expected: JSON response with cryptocurrency data

### 3. Frontend Access
- [ ] Visit `https://your-app.railway.app` in browser
- [ ] Application loads correctly
- [ ] No console errors

## 🚨 Troubleshooting

### If Health Check Fails
1. Check Railway deployment logs
2. Verify `NODE_ENV=production` is set
3. Check server startup logs for errors
4. Ensure port configuration is correct

### If Build Fails
1. Check TypeScript compilation errors
2. Verify all dependencies are installed
3. Check for syntax errors in modified files

### If Services Don't Initialize
1. Check database connection (SQLite should work by default)
2. Verify optional environment variables
3. Check background service initialization logs

## 📋 Success Criteria

### ✅ Deployment Successful When:
- [ ] Railway build completes without errors
- [ ] Health check returns 200 OK status
- [ ] Application is accessible via Railway URL
- [ ] API endpoints respond correctly
- [ ] Frontend loads without errors
- [ ] Background services initialize (may take a few minutes)

### 📊 Expected Health Check Response:
```json
{
  "status": "OK",
  "service": "Crypto Intelligence Engine",
  "server_ready": true,
  "services_ready": true/false,
  "uptime": "number",
  "timestamp": "ISO string",
  "port": "Railway port",
  "environment": "production"
}
```

## 🔧 Quick Commands

### Local Testing
```bash
# Build server
cd server && npm run build

# Start server
NODE_ENV=production PORT=3001 node server.js

# Test health check
curl http://localhost:3001/

# Test API
curl http://localhost:3001/api/dashboard/data
```

### Deployment Verification
```bash
# Check deployment status
node scripts/check-deployment-status.js your-app.railway.app

# Verify Railway deployment
node scripts/verify-railway-deployment.js
```

---

**Last Updated**: 2025-05-28
**Status**: Ready for deployment ✅ 
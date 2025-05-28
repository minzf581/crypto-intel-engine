#!/bin/bash

echo "🚀 Railway Deployment Script for Crypto Intelligence Engine"
echo "==========================================================="

# Set strict error handling
set -e

# Environment setup
export NODE_ENV=production
export PATH=$PATH:/usr/local/bin

echo "📋 Environment Information:"
echo "   NODE_ENV: $NODE_ENV"
echo "   NODE_VERSION: $(node --version)"
echo "   NPM_VERSION: $(npm --version)"
echo "   PWD: $(pwd)"
echo "   PORT: ${PORT:-5001}"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf server/dist client/dist

# Install dependencies with production optimizations
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Build server
echo "🔨 Building server..."
cd server
npm run build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Server build failed - dist/index.js not found"
    exit 1
fi
echo "✅ Server built successfully"
cd ..

# Build client
echo "🎨 Building client..."
cd client
npm run build
if [ ! -d "dist" ]; then
    echo "❌ Client build failed - dist directory not found"
    exit 1
fi
echo "✅ Client built successfully"
cd ..

# Verify builds
echo "🔍 Verifying builds..."
echo "   Server dist: $(ls -la server/dist/ | wc -l) files"
echo "   Client dist: $(ls -la client/dist/ | wc -l) files"

# Create startup verification
echo "✅ Creating startup script..."
cat > verify-startup.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 5001;

console.log('🔍 Verifying server startup...');

const options = {
  hostname: 'localhost',
  port: port,
  path: '/health',
  method: 'GET'
};

setTimeout(() => {
  const req = http.request(options, (res) => {
    console.log(`✅ Health check status: ${res.statusCode}`);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });

  req.on('error', (err) => {
    console.error('❌ Health check failed:', err.message);
    process.exit(1);
  });

  req.end();
}, 5000);
EOF

echo "🎉 Deployment preparation completed successfully!"
echo "📝 Next steps:"
echo "   1. Server will start with: npm start"
echo "   2. Health check available at: /health"
echo "   3. Main app available at: /"
echo "===========================================================" 
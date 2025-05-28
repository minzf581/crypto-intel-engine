#!/bin/bash

# Railway deployment startup script
echo "🚀 Starting Crypto Intelligence Engine for Railway..."

# Set environment variables
export NODE_ENV=production
export HOST=0.0.0.0
export PORT=${PORT:-5001}

echo "Environment: $NODE_ENV"
echo "Host: $HOST"
echo "Port: $PORT"

# Check if server is built
if [ ! -f "server/dist/index.js" ]; then
    echo "❌ Server not built! Building now..."
    cd server && npm run build && cd ..
fi

# Check if client is built
if [ ! -d "client/dist" ]; then
    echo "❌ Client not built! Building now..."
    cd client && npm run build && cd ..
fi

# Create required directories
mkdir -p server/data logs

# Start the server
echo "✅ Starting server..."
exec node server.js 
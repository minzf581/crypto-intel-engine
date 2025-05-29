#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting Crypto Intelligence Engine build process..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $(pwd)"

# Check if this is a Railway build
if [ "$RAILWAY_ENVIRONMENT" = "true" ] || [ -n "$RAILWAY_PROJECT_ID" ] || [ -n "$RAILWAY_SERVICE_ID" ]; then
    echo "🚂 Building for Railway environment"
    export RAILWAY_ENVIRONMENT=true
else
    echo "🏠 Building for local environment"
fi

# Build server
echo "🔧 Building server..."
cd server
npm run build
echo "✅ Server build completed"

# Build client
echo "🔧 Building client..."
cd ../client
if [ "$RAILWAY_ENVIRONMENT" = "true" ]; then
    echo "🚂 Building client for Railway with relative API paths"
    RAILWAY_ENVIRONMENT=true npm run build
else
    echo "🏠 Building client for local development"
    npm run build
fi
echo "✅ Client build completed"

# Return to root
cd ..

echo "🎉 Build process completed successfully!"
echo "📋 Build artifacts:"
echo "   Server: server/dist/"
echo "   Client: client/dist/"

# Verify build
if [ -f "server/dist/index.js" ] && [ -f "client/dist/index.html" ]; then
    echo "✅ All build artifacts verified"
    exit 0
else
    echo "❌ Build verification failed"
    exit 1
fi 
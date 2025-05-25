#!/bin/bash

# Railway Deployment Script for Crypto Intelligence Engine
# This script prepares and deploys the application to Railway

echo "🚀 Railway Deployment Script"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "railway.json" ]; then
    print_error "Not in the correct project directory. Please run this script from the project root."
    exit 1
fi

# Check if server is built
if [ ! -f "server/dist/index.js" ]; then
    print_warning "Server not built. Building now..."
    cd server && npm run build
    if [ $? -ne 0 ]; then
        print_error "Server build failed!"
        exit 1
    fi
    cd ..
    print_success "Server built successfully"
else
    print_success "Server already built"
fi

# Step 2: Run deployment test
print_status "Running deployment test..."
node test-railway-deployment.js

if [ $? -ne 0 ]; then
    print_error "Deployment test failed! Please fix the issues before deploying."
    exit 1
fi

print_success "Deployment test passed!"

# Step 3: Check git status
print_status "Checking git status..."

if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes. Committing them now..."
    
    # Add all changes
    git add .
    
    # Commit with timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "Railway deployment fix - $TIMESTAMP"
    
    if [ $? -ne 0 ]; then
        print_error "Git commit failed!"
        exit 1
    fi
    
    print_success "Changes committed successfully"
else
    print_success "No uncommitted changes"
fi

# Step 4: Push to repository
print_status "Pushing to git repository..."

git push origin main

if [ $? -ne 0 ]; then
    print_error "Git push failed! Please check your repository configuration."
    exit 1
fi

print_success "Code pushed to repository"

# Step 5: Railway deployment instructions
echo ""
print_success "🎉 Ready for Railway deployment!"
echo ""
echo "Next steps:"
echo "1. Go to your Railway dashboard: https://railway.app/dashboard"
echo "2. Create a new project or select existing project"
echo "3. Connect your GitHub repository"
echo "4. Railway will automatically detect the configuration and deploy"
echo ""
echo "Optional environment variables you can set in Railway:"
echo "- COINGECKO_API_KEY: For enhanced price data"
echo "- NEWSAPI_KEY: For NewsAPI integration"
echo "- FIREBASE_SERVICE_ACCOUNT_KEY: For push notifications"
echo ""
echo "Health check endpoint: https://your-app.up.railway.app/health"
echo ""
print_success "Deployment preparation complete!"

# Step 6: Open Railway dashboard (optional)
read -p "Do you want to open Railway dashboard in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "https://railway.app/dashboard"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://railway.app/dashboard"
    else
        print_warning "Cannot open browser automatically. Please visit: https://railway.app/dashboard"
    fi
fi

echo ""
print_success "🚀 Happy deploying!" 
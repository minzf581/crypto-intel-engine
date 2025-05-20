#!/bin/bash

# Define color output functions
print_green() {
    echo -e "\033[32m$1\033[0m"
}

print_yellow() {
    echo -e "\033[33m$1\033[0m"
}

print_red() {
    echo -e "\033[31m$1\033[0m"
}

print_yellow "Checking health status of frontend and backend services..."

# Check frontend service (Vite)
print_yellow "Checking frontend service (port 3000)..."
if curl -s http://localhost:3000 > /dev/null; then
    print_green "✅ Frontend service is running normally"
else
    print_red "❌ Frontend service is not running or inaccessible"
fi

# Check backend API service
print_yellow "Checking backend API service (port 5000)..."
RESPONSE=$(curl -s http://localhost:5000/health)
if [ $? -eq 0 ]; then
    print_green "✅ Backend API service is running normally: $RESPONSE"
else
    print_red "❌ Backend API service is not running or inaccessible"
fi

# Check database file
print_yellow "Checking database file..."
DB_PATH="server/data/crypto-intel.sqlite"
if [ -f "$DB_PATH" ]; then
    if [ -w "$DB_PATH" ]; then
        print_green "✅ Database file exists and is writable"
    else
        print_red "❌ Database file exists but is not writable"
    fi
else
    print_red "❌ Database file does not exist"
fi

# Summary
echo "----------------------------------------"
print_green "Health check completed"
echo "----------------------------------------" 
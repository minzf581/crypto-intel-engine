#!/bin/bash

# Define ports to check
PORTS=(3000 5000)

# Function to print colored text
print_green() {
    echo -e "\033[32m$1\033[0m"
}

print_yellow() {
    echo -e "\033[33m$1\033[0m"
}

print_red() {
    echo -e "\033[31m$1\033[0m"
}

# Print header
echo "----------------------------------------"
print_green "    Crypto Intelligence Engine - Cleanup Script"
echo "----------------------------------------"

# Kill processes occupying specific ports
for PORT in "${PORTS[@]}"; do
    print_yellow "Checking if port $PORT is in use..."
    PID=$(lsof -t -i:$PORT)
    if [ ! -z "$PID" ]; then
        print_yellow "Found process $PID using port $PORT, terminating..."
        kill $PID
        sleep 2
        
        # Check again
        CHECK_PID=$(lsof -t -i:$PORT)
        if [ ! -z "$CHECK_PID" ]; then
            print_red "Could not terminate process, try manual kill: kill -9 $CHECK_PID"
        else
            print_green "Process terminated, port $PORT is now free"
        fi
    else
        print_green "Port $PORT is not in use"
    fi
done

# Kill potential node processes
NODE_PIDS=$(ps aux | grep '[n]ode' | awk '{print $2}')
if [ ! -z "$NODE_PIDS" ]; then
    echo "Killing Node.js processes..."
    kill $NODE_PIDS 2>/dev/null
    sleep 2
fi

echo "----------------------------------------"
print_green "Cleanup completed"
echo "----------------------------------------" 
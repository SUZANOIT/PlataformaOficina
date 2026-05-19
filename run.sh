#!/bin/bash

# Exit on error for initial commands
set -e

echo "Starting the application..."

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
cd ..

# Start backend with frontend serving
echo "Starting backend server with frontend..."
cd backend
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

# Set PORT to 8080 for production
PORT=8080 npm run dev &
BACKEND_PID=$!
cd ..

echo ""
echo "========================================="
echo "Application is starting up!"
echo "Backend:  http://localhost:8080"
echo "Frontend: Served from backend"
echo "========================================="
echo "Press Ctrl+C to stop all services."

# Function to handle script termination
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C (SIGINT) and other termination signals
trap cleanup SIGINT SIGTERM EXIT

# Wait for all background processes
wait $BACKEND_PID

#!/bin/bash

# Exit on error for initial commands
set -e

echo "Starting the application..."

# Start backend
echo "Starting backend server..."
cd backend
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend application..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================="
echo "Application is starting up!"
echo "Backend:  http://localhost:3333 (default)"
echo "Frontend: http://localhost:5173 (default)"
echo "========================================="
echo "Press Ctrl+C to stop all services."

# Function to handle script termination
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C (SIGINT) and other termination signals
trap cleanup SIGINT SIGTERM EXIT

# Wait for all background processes
wait $BACKEND_PID $FRONTEND_PID

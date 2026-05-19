#!/bin/bash

# Exit on error
set -e

echo "Starting the application..."

# Build frontend
echo "Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi
npm run build
cd ..

# Start backend (serves both API and frontend static files on port 8080)
echo "Starting backend server on port 8080..."
cd backend
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi
PORT=8080 npm run dev

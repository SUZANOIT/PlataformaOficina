#!/bin/bash

# Exit on error
set -e

echo "Starting the application..."

# 1. Build frontend if it hasn't been built yet
if [ ! -d "frontend/dist" ]; then
  echo "frontend/dist not found. Building frontend..."
  cd frontend
  if [ ! -d "node_modules" ]; then
    npm install
  fi
  npm run build
  cd ..
fi

# 2. Build backend if not built
if [ ! -d "backend/dist" ]; then
  echo "backend/dist not found. Building backend..."
  cd backend
  if [ ! -d "node_modules" ]; then
    npm install
  fi
  npm run build
  cd ..
fi

# 3. Start the server
npm start

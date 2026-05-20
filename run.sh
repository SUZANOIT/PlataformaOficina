#!/bin/bash

# Exit on error
set -e

echo "Starting the application..."

# 1. Build frontend
echo "Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
cd ..

# 2. Build backend
echo "Building backend..."
cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
cd ..

# 3. Start the server
npm start

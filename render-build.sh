#!/bin/bash
echo "Starting build process for Render..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

echo "Step 1: Installing root dependencies..."
npm install --production

echo "Step 2: Installing client dependencies..."
cd src
npm install --production
echo "Building client..."
npm run build
cd ..

echo "Step 3: Installing server dependencies..."
cd server
npm install --production
cd ..

echo "Build completed successfully!"
echo "Final directory structure:"
ls -la
echo "Build directory:"
ls -la build/